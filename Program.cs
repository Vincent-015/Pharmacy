using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using PharmacyMS.Data;
using PharmacyMS.Models;

var builder = WebApplication.CreateBuilder(args);

var jwtKey = "PharmacyMS_SuperSecret_Key_2024_JVW";
var jwtIssuer = "PharmacyMS";

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite("Data Source=pharmacy.db"));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt => {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await AppDbContext.SeedAsync(db);
}

app.UseAuthentication();
app.UseAuthorization();
app.UseCors();
app.UseStaticFiles();

// ─── AUTH ────────────────────────────────────────────────────────────────────
app.MapPost("/api/auth/login", async (AppDbContext db, LoginRequest req) =>
{
    var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);
    if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
        return Results.Unauthorized();

    var claims = new[] {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Name, user.Username),
        new Claim(ClaimTypes.Role, user.Role)
    };
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
    var token = new JwtSecurityToken(jwtIssuer, null, claims,
        expires: DateTime.UtcNow.AddHours(12),
        signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
    var tokenStr = new JwtSecurityTokenHandler().WriteToken(token);
    return Results.Ok(new { token = tokenStr, username = user.Username, role = user.Role });
});

app.MapPost("/api/auth/create-user", async (AppDbContext db, CreateUserRequest req, HttpContext ctx) =>
{
    // Only admin can create users
    var authHeader = ctx.Request.Headers["Authorization"].FirstOrDefault();
    if (authHeader == null || !authHeader.StartsWith("Bearer ")) return Results.Unauthorized();
    var tokenStr = authHeader.Substring(7);
    try {
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(tokenStr);
        var role = token.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
        if (role != "admin") return Results.Forbid();
    } catch { return Results.Unauthorized(); }

    if (await db.Users.AnyAsync(u => u.Username == req.Username))
        return Results.BadRequest(new { error = "Username already exists" });

    var user = new User
    {
        Username = req.Username,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
        Role = req.Role ?? "staff"
    };
    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Ok(new { id = user.Id, username = user.Username, role = user.Role });
}).RequireAuthorization();

app.MapGet("/api/auth/users", async (AppDbContext db) =>
{
    var users = await db.Users.Select(u => new { u.Id, u.Username, u.Role, u.CreatedAt }).ToListAsync();
    return Results.Ok(users);
}).RequireAuthorization();

app.MapDelete("/api/auth/users/{id}", async (AppDbContext db, int id) =>
{
    var user = await db.Users.FindAsync(id);
    if (user == null) return Results.NotFound();
    if (user.Username == "admin") return Results.BadRequest(new { error = "Cannot delete default admin" });
    db.Users.Remove(user);
    await db.SaveChangesAsync();
    return Results.Ok();
}).RequireAuthorization();

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
app.MapGet("/api/dashboard", async (AppDbContext db) =>
{
    var today = DateTime.UtcNow.Date;
    var todaySales = await db.Sales.Where(s => s.CreatedAt.Date == today && s.Status == "completed").SumAsync(s => (double)s.Total);
    var totalMedicines = await db.Medicines.CountAsync();
    var lowStock = await db.Medicines.CountAsync(m => m.Stock <= m.ReorderLevel && m.Status == "active");
    var totalCustomers = await db.Customers.CountAsync();
    var totalSalesToday = await db.Sales.CountAsync(s => s.CreatedAt.Date == today);
    var expiringSoon = await db.Medicines.CountAsync(m => m.ExpiryDate <= DateTime.UtcNow.AddDays(30) && m.Status == "active");
    var recentSales = await db.Sales.Include(s => s.Customer).Include(s => s.SaleItems).ThenInclude(i => i.Medicine)
        .OrderByDescending(s => s.CreatedAt).Take(5).ToListAsync();
    var monthlySales = await db.Sales
        .Where(s => s.CreatedAt >= DateTime.UtcNow.AddMonths(-6) && s.Status == "completed")
        .GroupBy(s => new { s.CreatedAt.Year, s.CreatedAt.Month })
        .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(s => (double)s.Total), Count = g.Count() })
        .OrderBy(x => x.Year).ThenBy(x => x.Month)
        .ToListAsync();

    return Results.Ok(new {
        todaySales,
        totalMedicines,
        lowStock,
        totalCustomers,
        totalSalesToday,
        expiringSoon,
        recentSales = recentSales.Select(s => new {
            s.Id, s.ReceiptNumber, s.Total, s.Status, s.CreatedAt, s.PaymentMethod,
            customerName = s.Customer != null ? $"{s.Customer.FirstName} {s.Customer.LastName}" : "Walk-in",
            itemCount = s.SaleItems.Count
        }),
        monthlySales
    });
}).RequireAuthorization();

// ─── MEDICINES ────────────────────────────────────────────────────────────────
app.MapGet("/api/medicines", async (AppDbContext db, string? search, string? category, string? status) =>
{
    var q = db.Medicines.Include(m => m.Supplier).AsQueryable();
    if (!string.IsNullOrEmpty(search))
        q = q.Where(m => m.Name.Contains(search) || m.GenericName.Contains(search));
    if (!string.IsNullOrEmpty(category))
        q = q.Where(m => m.Category == category);
    if (!string.IsNullOrEmpty(status))
        q = q.Where(m => m.Status == status);
    var list = await q.OrderBy(m => m.Name).ToListAsync();
    return Results.Ok(list.Select(m => new {
        m.Id, m.Name, m.GenericName, m.Category, m.Description, m.Price, m.Stock,
        m.ReorderLevel, m.Unit, m.Barcode, m.SupplierId, m.ExpiryDate, m.Status, m.CreatedAt,
        supplierName = m.Supplier?.Name,
        isLowStock = m.Stock <= m.ReorderLevel,
        isExpiringSoon = m.ExpiryDate <= DateTime.UtcNow.AddDays(30)
    }));
}).RequireAuthorization();

app.MapGet("/api/medicines/{id}", async (AppDbContext db, int id) =>
{
    var m = await db.Medicines.Include(x => x.Supplier).FirstOrDefaultAsync(x => x.Id == id);
    if (m == null) return Results.NotFound();
    return Results.Ok(new {
        m.Id, m.Name, m.GenericName, m.Category, m.Description, m.Price, m.Stock,
        m.ReorderLevel, m.Unit, m.Barcode, m.SupplierId, m.ExpiryDate, m.Status, m.CreatedAt,
        supplierName = m.Supplier?.Name,
        isLowStock = m.Stock <= m.ReorderLevel,
        isExpiringSoon = m.ExpiryDate <= DateTime.UtcNow.AddDays(30)
    });
}).RequireAuthorization();

app.MapPost("/api/medicines", async (AppDbContext db, Medicine med) =>
{
    med.CreatedAt = med.UpdatedAt = DateTime.UtcNow;
    db.Medicines.Add(med);
    await db.SaveChangesAsync();
    if (med.Stock > 0)
    {
        db.StockMovements.Add(new StockMovement { MedicineId = med.Id, Type = "in", Quantity = med.Stock, Reason = "Initial stock" });
        await db.SaveChangesAsync();
    }
    return Results.Created($"/api/medicines/{med.Id}", med);
}).RequireAuthorization();

app.MapPut("/api/medicines/{id}", async (AppDbContext db, int id, Medicine updated) =>
{
    var med = await db.Medicines.FindAsync(id);
    if (med == null) return Results.NotFound();
    var oldStock = med.Stock;
    med.Name = updated.Name; med.GenericName = updated.GenericName;
    med.Category = updated.Category; med.Description = updated.Description;
    med.Price = updated.Price; med.Stock = updated.Stock;
    med.ReorderLevel = updated.ReorderLevel; med.Unit = updated.Unit;
    med.Barcode = updated.Barcode; med.SupplierId = updated.SupplierId;
    med.ExpiryDate = updated.ExpiryDate; med.Status = updated.Status;
    med.UpdatedAt = DateTime.UtcNow;
    if (updated.Stock != oldStock)
    {
        var diff = updated.Stock - oldStock;
        db.StockMovements.Add(new StockMovement {
            MedicineId = id, Type = diff > 0 ? "in" : "out",
            Quantity = Math.Abs(diff), Reason = "Manual adjustment"
        });
    }
    await db.SaveChangesAsync();
    return Results.Ok(med);
}).RequireAuthorization();

app.MapDelete("/api/medicines/{id}", async (AppDbContext db, int id) =>
{
    var med = await db.Medicines.FindAsync(id);
    if (med == null) return Results.NotFound();

    // Remove child records first to avoid FK constraint violations
    var saleItems = db.SaleItems.Where(si => si.MedicineId == id);
    db.SaleItems.RemoveRange(saleItems);

    var movements = db.StockMovements.Where(sm => sm.MedicineId == id);
    db.StockMovements.RemoveRange(movements);

    db.Medicines.Remove(med);
    await db.SaveChangesAsync();
    return Results.Ok();
}).RequireAuthorization();

app.MapGet("/api/medicines/categories", async (AppDbContext db) =>
{
    var cats = await db.Medicines.Select(m => m.Category).Distinct().OrderBy(c => c).ToListAsync();
    return Results.Ok(cats);
}).RequireAuthorization();

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────
app.MapGet("/api/suppliers", async (AppDbContext db) =>
{
    var list = await db.Suppliers.Include(s => s.Medicines).OrderBy(s => s.Name).ToListAsync();
    return Results.Ok(list.Select(s => new { s.Id, s.Name, s.ContactPerson, s.Phone, s.Email, s.Address, s.Status, s.CreatedAt, medicineCount = s.Medicines.Count }));
}).RequireAuthorization();

app.MapPost("/api/suppliers", async (AppDbContext db, Supplier sup) =>
{
    sup.CreatedAt = DateTime.UtcNow;
    db.Suppliers.Add(sup);
    await db.SaveChangesAsync();
    return Results.Created($"/api/suppliers/{sup.Id}", sup);
}).RequireAuthorization();

app.MapPut("/api/suppliers/{id}", async (AppDbContext db, int id, Supplier updated) =>
{
    var sup = await db.Suppliers.FindAsync(id);
    if (sup == null) return Results.NotFound();
    sup.Name = updated.Name; sup.ContactPerson = updated.ContactPerson;
    sup.Phone = updated.Phone; sup.Email = updated.Email;
    sup.Address = updated.Address; sup.Status = updated.Status;
    await db.SaveChangesAsync();
    return Results.Ok(sup);
}).RequireAuthorization();

app.MapDelete("/api/suppliers/{id}", async (AppDbContext db, int id) =>
{
    var sup = await db.Suppliers.FindAsync(id);
    if (sup == null) return Results.NotFound();
    db.Suppliers.Remove(sup);
    await db.SaveChangesAsync();
    return Results.Ok();
}).RequireAuthorization();

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
app.MapGet("/api/customers", async (AppDbContext db, string? search) =>
{
    var q = db.Customers.Include(c => c.Sales).AsQueryable();
    if (!string.IsNullOrEmpty(search))
        q = q.Where(c => c.FirstName.Contains(search) || c.LastName.Contains(search) || c.Phone.Contains(search));
    var list = await q.OrderBy(c => c.LastName).ToListAsync();
    return Results.Ok(list.Select(c => new {
        c.Id, c.FirstName, c.LastName, c.Phone, c.Email, c.Address, c.CreatedAt,
        fullName = $"{c.FirstName} {c.LastName}",
        totalPurchases = c.Sales.Sum(s => (double)s.Total),
        purchaseCount = c.Sales.Count
    }));
}).RequireAuthorization();

app.MapPost("/api/customers", async (AppDbContext db, Customer cust) =>
{
    cust.CreatedAt = DateTime.UtcNow;
    db.Customers.Add(cust);
    await db.SaveChangesAsync();
    return Results.Created($"/api/customers/{cust.Id}", cust);
}).RequireAuthorization();

app.MapPut("/api/customers/{id}", async (AppDbContext db, int id, Customer updated) =>
{
    var cust = await db.Customers.FindAsync(id);
    if (cust == null) return Results.NotFound();
    cust.FirstName = updated.FirstName; cust.LastName = updated.LastName;
    cust.Phone = updated.Phone; cust.Email = updated.Email; cust.Address = updated.Address;
    await db.SaveChangesAsync();
    return Results.Ok(cust);
}).RequireAuthorization();

app.MapDelete("/api/customers/{id}", async (AppDbContext db, int id) =>
{
    var cust = await db.Customers.FindAsync(id);
    if (cust == null) return Results.NotFound();
    db.Customers.Remove(cust);
    await db.SaveChangesAsync();
    return Results.Ok();
}).RequireAuthorization();

// ─── SALES ────────────────────────────────────────────────────────────────────
app.MapGet("/api/sales", async (AppDbContext db, string? startDate, string? endDate) =>
{
    var q = db.Sales.Include(s => s.Customer).Include(s => s.SaleItems).ThenInclude(i => i.Medicine).AsQueryable();
    if (!string.IsNullOrEmpty(startDate) && DateTime.TryParse(startDate, out var sd))
        q = q.Where(s => s.CreatedAt.Date >= sd.Date);
    if (!string.IsNullOrEmpty(endDate) && DateTime.TryParse(endDate, out var ed))
        q = q.Where(s => s.CreatedAt.Date <= ed.Date);
    var list = await q.OrderByDescending(s => s.CreatedAt).ToListAsync();
    return Results.Ok(list.Select(s => new {
        s.Id, s.ReceiptNumber, s.SubTotal, s.Discount, s.Tax, s.Total,
        s.PaymentMethod, s.AmountPaid, s.Change, s.Status, s.Notes, s.CreatedAt,
        customerName = s.Customer != null ? $"{s.Customer.FirstName} {s.Customer.LastName}" : "Walk-in",
        customerId = s.CustomerId,
        items = s.SaleItems.Select(i => new { i.Id, i.MedicineId, medicineName = i.Medicine.Name, i.Quantity, i.UnitPrice, i.Subtotal })
    }));
}).RequireAuthorization();

app.MapGet("/api/sales/{id}", async (AppDbContext db, int id) =>
{
    var s = await db.Sales.Include(x => x.Customer).Include(x => x.SaleItems).ThenInclude(i => i.Medicine).FirstOrDefaultAsync(x => x.Id == id);
    if (s == null) return Results.NotFound();
    return Results.Ok(new {
        s.Id, s.ReceiptNumber, s.SubTotal, s.Discount, s.Tax, s.Total,
        s.PaymentMethod, s.AmountPaid, s.Change, s.Status, s.Notes, s.CreatedAt,
        customerName = s.Customer != null ? $"{s.Customer.FirstName} {s.Customer.LastName}" : "Walk-in",
        customerId = s.CustomerId, customerPhone = s.Customer?.Phone,
        items = s.SaleItems.Select(i => new { i.Id, i.MedicineId, medicineName = i.Medicine.Name, i.Medicine.GenericName, i.Quantity, i.UnitPrice, i.Subtotal })
    });
}).RequireAuthorization();

app.MapPost("/api/sales", async (AppDbContext db, CreateSaleRequest req) =>
{
    // Validate stock
    foreach (var item in req.Items)
    {
        var med = await db.Medicines.FindAsync(item.MedicineId);
        if (med == null) return Results.BadRequest(new { error = $"Medicine {item.MedicineId} not found" });
        if (med.Stock < item.Quantity) return Results.BadRequest(new { error = $"Insufficient stock for {med.Name}. Available: {med.Stock}" });
    }

    var receiptNumber = $"RX-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";
    var sale = new Sale
    {
        ReceiptNumber = receiptNumber,
        CustomerId = req.CustomerId,
        Discount = req.Discount,
        PaymentMethod = req.PaymentMethod,
        AmountPaid = req.AmountPaid,
        Notes = req.Notes,
        Status = "completed",
        CreatedAt = DateTime.UtcNow
    };

    decimal subTotal = 0;
    var saleItems = new List<SaleItem>();
    foreach (var item in req.Items)
    {
        var med = await db.Medicines.FindAsync(item.MedicineId);
        var subtotal = med!.Price * item.Quantity;
        subTotal += subtotal;
        saleItems.Add(new SaleItem { MedicineId = item.MedicineId, Quantity = item.Quantity, UnitPrice = med.Price, Subtotal = subtotal });
    }

    sale.SubTotal = subTotal;
    sale.Tax = 0; // VAT-exempt for medicines in PH
    sale.Total = subTotal - req.Discount;
    sale.Change = req.AmountPaid - sale.Total;

    db.Sales.Add(sale);
    await db.SaveChangesAsync();

    foreach (var si in saleItems) { si.SaleId = sale.Id; db.SaleItems.Add(si); }

    // Deduct stock
    foreach (var item in req.Items)
    {
        var med = await db.Medicines.FindAsync(item.MedicineId);
        med!.Stock -= item.Quantity;
        med.UpdatedAt = DateTime.UtcNow;
        db.StockMovements.Add(new StockMovement { MedicineId = item.MedicineId, Type = "out", Quantity = item.Quantity, Reason = $"Sale {receiptNumber}", SaleId = sale.Id });
    }
    await db.SaveChangesAsync();

    return Results.Created($"/api/sales/{sale.Id}", new { sale.Id, sale.ReceiptNumber, sale.Total, sale.Change, sale.Status });
}).RequireAuthorization();

// ─── STOCK ────────────────────────────────────────────────────────────────────
app.MapPost("/api/stock/adjust", async (AppDbContext db, StockAdjustRequest req) =>
{
    var med = await db.Medicines.FindAsync(req.MedicineId);
    if (med == null) return Results.NotFound();
    if (req.Type == "out" && med.Stock < req.Quantity)
        return Results.BadRequest(new { error = "Insufficient stock" });
    med.Stock = req.Type == "in" ? med.Stock + req.Quantity : med.Stock - req.Quantity;
    med.UpdatedAt = DateTime.UtcNow;
    db.StockMovements.Add(new StockMovement { MedicineId = req.MedicineId, Type = req.Type, Quantity = req.Quantity, Reason = req.Reason });
    await db.SaveChangesAsync();
    return Results.Ok(new { med.Id, med.Stock });
}).RequireAuthorization();

app.MapGet("/api/stock/movements", async (AppDbContext db, int? medicineId) =>
{
    var q = db.StockMovements.Include(s => s.Medicine).AsQueryable();
    if (medicineId.HasValue) q = q.Where(s => s.MedicineId == medicineId.Value);
    var list = await q.OrderByDescending(s => s.CreatedAt).Take(100).ToListAsync();
    return Results.Ok(list.Select(s => new { s.Id, s.MedicineId, medicineName = s.Medicine.Name, s.Type, s.Quantity, s.Reason, s.SaleId, s.CreatedAt }));
}).RequireAuthorization();

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────
app.MapGet("/api/employees", async (AppDbContext db) =>
{
    return Results.Ok(await db.Employees.OrderBy(e => e.LastName).ToListAsync());
}).RequireAuthorization();

app.MapPost("/api/employees", async (AppDbContext db, Employee emp) =>
{
    emp.CreatedAt = DateTime.UtcNow;
    db.Employees.Add(emp);
    await db.SaveChangesAsync();
    return Results.Created($"/api/employees/{emp.Id}", emp);
}).RequireAuthorization();

app.MapPut("/api/employees/{id}", async (AppDbContext db, int id, Employee updated) =>
{
    var emp = await db.Employees.FindAsync(id);
    if (emp == null) return Results.NotFound();
    emp.FirstName = updated.FirstName; emp.LastName = updated.LastName;
    emp.Position = updated.Position; emp.Phone = updated.Phone;
    emp.Email = updated.Email; emp.Status = updated.Status;
    emp.HiredAt = updated.HiredAt;
    await db.SaveChangesAsync();
    return Results.Ok(emp);
}).RequireAuthorization();

app.MapDelete("/api/employees/{id}", async (AppDbContext db, int id) =>
{
    var emp = await db.Employees.FindAsync(id);
    if (emp == null) return Results.NotFound();
    db.Employees.Remove(emp);
    await db.SaveChangesAsync();
    return Results.Ok();
}).RequireAuthorization();

// ─── FALLBACK TO SPA ─────────────────────────────────────────────────────────
app.MapFallbackToFile("index.html");

app.Run();

// ─── REQUEST DTOs ─────────────────────────────────────────────────────────────
record LoginRequest(string Username, string Password);
record CreateUserRequest(string Username, string Password, string? Role);
record SaleItemRequest(int MedicineId, int Quantity);
record CreateSaleRequest(int? CustomerId, List<SaleItemRequest> Items, decimal Discount, string PaymentMethod, decimal AmountPaid, string? Notes);
record StockAdjustRequest(int MedicineId, string Type, int Quantity, string Reason);
