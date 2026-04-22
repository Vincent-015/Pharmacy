using Microsoft.EntityFrameworkCore;
using PharmacyMS.Models;

namespace PharmacyMS.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Medicine> Medicines => Set<Medicine>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<Employee> Employees => Set<Employee>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.Entity<Medicine>(e => {
            e.HasKey(x => x.Id);
            e.Property(x => x.Price).HasColumnType("REAL");
            e.HasOne(x => x.Supplier).WithMany(s => s.Medicines).HasForeignKey(x => x.SupplierId).OnDelete(DeleteBehavior.SetNull);
        });
        m.Entity<Sale>(e => {
            e.HasKey(x => x.Id);
            e.Property(x => x.SubTotal).HasColumnType("REAL");
            e.Property(x => x.Discount).HasColumnType("REAL");
            e.Property(x => x.Tax).HasColumnType("REAL");
            e.Property(x => x.Total).HasColumnType("REAL");
            e.Property(x => x.AmountPaid).HasColumnType("REAL");
            e.Property(x => x.Change).HasColumnType("REAL");
            e.HasOne(x => x.Customer).WithMany(c => c.Sales).HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.SetNull);
            e.HasMany(x => x.SaleItems).WithOne(i => i.Sale).HasForeignKey(i => i.SaleId).OnDelete(DeleteBehavior.Cascade);
        });
        m.Entity<SaleItem>(e => {
            e.HasKey(x => x.Id);
            e.Property(x => x.UnitPrice).HasColumnType("REAL");
            e.Property(x => x.Subtotal).HasColumnType("REAL");
            e.HasOne(x => x.Medicine).WithMany(med => med.SaleItems).HasForeignKey(x => x.MedicineId).OnDelete(DeleteBehavior.Restrict);
        });
        m.Entity<StockMovement>(e => {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Medicine).WithMany(med => med.StockMovements).HasForeignKey(x => x.MedicineId).OnDelete(DeleteBehavior.Cascade);
        });
        m.Entity<User>(e => {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Username).IsUnique();
        });
        m.Entity<Customer>(e => e.HasIndex(x => x.Phone));
        m.Entity<Supplier>(e => e.HasIndex(x => x.Name));
    }

    public static async Task SeedAsync(AppDbContext db)
    {
        await db.Database.EnsureCreatedAsync();

        if (!await db.Users.AnyAsync())
        {
            db.Users.Add(new User
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Role = "admin",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        if (!await db.Suppliers.AnyAsync())
        {
            var suppliers = new List<Supplier>
            {
                new() { Name = "MedPharm Distributors", ContactPerson = "Juan dela Cruz", Phone = "+63 917 111 2222", Email = "juan@medpharm.ph", Address = "Cebu City", Status = "active" },
                new() { Name = "Generika Supply Co.", ContactPerson = "Ana Reyes", Phone = "+63 918 333 4444", Email = "ana@generika.ph", Address = "Mandaue City", Status = "active" },
                new() { Name = "PhilHealth Supplies", ContactPerson = "Carlos Gomez", Phone = "+63 912 555 6666", Email = "carlos@philhealth.ph", Address = "Lapu-Lapu City", Status = "active" }
            };
            db.Suppliers.AddRange(suppliers);
            await db.SaveChangesAsync();

            var sup = await db.Suppliers.ToListAsync();
            var now = DateTime.UtcNow;
            var medicines = new List<Medicine>
            {
                new() { Name = "Biogesic", GenericName = "Paracetamol 500mg", Category = "Analgesic", Description = "Pain reliever and fever reducer", Price = 8.50m, Stock = 500, ReorderLevel = 50, Unit = "tablet", SupplierId = sup[0].Id, ExpiryDate = now.AddYears(2), Status = "active" },
                new() { Name = "Bioflu", GenericName = "Phenylephrine + Chlorphenamine", Category = "Cold & Flu", Description = "For colds, flu, and fever", Price = 12.00m, Stock = 300, ReorderLevel = 30, Unit = "tablet", SupplierId = sup[0].Id, ExpiryDate = now.AddYears(2), Status = "active" },
                new() { Name = "Amoxicillin 500mg", GenericName = "Amoxicillin", Category = "Antibiotic", Description = "Broad-spectrum antibiotic", Price = 15.75m, Stock = 200, ReorderLevel = 20, Unit = "capsule", SupplierId = sup[1].Id, ExpiryDate = now.AddYears(1), Status = "active" },
                new() { Name = "Losartan 50mg", GenericName = "Losartan Potassium", Category = "Cardiovascular", Description = "For high blood pressure", Price = 22.00m, Stock = 150, ReorderLevel = 15, Unit = "tablet", SupplierId = sup[1].Id, ExpiryDate = now.AddYears(2), Status = "active" },
                new() { Name = "Metformin 500mg", GenericName = "Metformin HCl", Category = "Diabetes", Description = "Blood sugar control", Price = 18.50m, Stock = 180, ReorderLevel = 20, Unit = "tablet", SupplierId = sup[2].Id, ExpiryDate = now.AddYears(2), Status = "active" },
                new() { Name = "Omeprazole 20mg", GenericName = "Omeprazole", Category = "Gastrointestinal", Description = "Acid reflux and ulcer treatment", Price = 25.00m, Stock = 100, ReorderLevel = 10, Unit = "capsule", SupplierId = sup[2].Id, ExpiryDate = now.AddYears(1), Status = "active" },
                new() { Name = "Vitamin C 500mg", GenericName = "Ascorbic Acid", Category = "Vitamins", Description = "Immune system support", Price = 6.00m, Stock = 600, ReorderLevel = 60, Unit = "tablet", SupplierId = sup[0].Id, ExpiryDate = now.AddYears(3), Status = "active" },
                new() { Name = "Cetirizine 10mg", GenericName = "Cetirizine HCl", Category = "Antihistamine", Description = "Allergy relief", Price = 10.50m, Stock = 8, ReorderLevel = 20, Unit = "tablet", SupplierId = sup[1].Id, ExpiryDate = now.AddYears(2), Status = "active" },
            };
            db.Medicines.AddRange(medicines);
            await db.SaveChangesAsync();
        }

        if (!await db.Customers.AnyAsync())
        {
            db.Customers.AddRange(
                new Customer { FirstName = "Maria", LastName = "Santos", Phone = "+63 912 345 6789", Email = "maria@gmail.com", Address = "Cebu City" },
                new Customer { FirstName = "Jose", LastName = "Reyes", Phone = "+63 917 654 3210", Email = "jose@yahoo.com", Address = "Mandaue City" },
                new Customer { FirstName = "Ana", LastName = "Dela Cruz", Phone = "+63 919 111 2233", Email = "ana@gmail.com", Address = "Lapu-Lapu City" }
            );
            await db.SaveChangesAsync();
        }

        if (!await db.Employees.AnyAsync())
        {
            db.Employees.AddRange(
                new Employee { FirstName = "Rosa", LastName = "Aquino", Position = "Pharmacist", Phone = "+63 912 100 2000", Email = "rosa@pharmacy.ph", Status = "active" },
                new Employee { FirstName = "Pedro", LastName = "Bautista", Position = "Cashier", Phone = "+63 917 200 3000", Email = "pedro@pharmacy.ph", Status = "active" }
            );
            await db.SaveChangesAsync();
        }
    }
}
