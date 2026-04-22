import { useState, useEffect, useCallback } from "react";

// ── SEED DATA ────────────────────────────────────────────────────────────────
const SEED = {
  users: [{ id: 1, username: "admin", password: "admin123", role: "admin", createdAt: new Date().toISOString() }],
  suppliers: [
    { id: 1, name: "MedPharm Distributors", contactPerson: "Juan dela Cruz", phone: "+63 917 111 2222", email: "juan@medpharm.ph", address: "Cebu City", status: "active" },
    { id: 2, name: "Generika Supply Co.", contactPerson: "Ana Reyes", phone: "+63 918 333 4444", email: "ana@generika.ph", address: "Mandaue City", status: "active" },
    { id: 3, name: "PhilHealth Supplies", contactPerson: "Carlos Gomez", phone: "+63 912 555 6666", email: "carlos@philhealth.ph", address: "Lapu-Lapu City", status: "active" },
  ],
  medicines: [
    { id: 1, name: "Biogesic", genericName: "Paracetamol 500mg", category: "Analgesic", price: 8.50, stock: 500, reorderLevel: 50, unit: "tablet", supplierId: 1, expiryDate: "2026-12-01", status: "active", description: "Pain reliever and fever reducer" },
    { id: 2, name: "Bioflu", genericName: "Phenylephrine + Chlorphenamine", category: "Cold & Flu", price: 12.00, stock: 300, reorderLevel: 30, unit: "tablet", supplierId: 1, expiryDate: "2026-08-15", status: "active", description: "For colds, flu, and fever" },
    { id: 3, name: "Amoxicillin 500mg", genericName: "Amoxicillin", category: "Antibiotic", price: 15.75, stock: 200, reorderLevel: 20, unit: "capsule", supplierId: 2, expiryDate: "2025-11-30", status: "active", description: "Broad-spectrum antibiotic" },
    { id: 4, name: "Losartan 50mg", genericName: "Losartan Potassium", category: "Cardiovascular", price: 22.00, stock: 150, reorderLevel: 15, unit: "tablet", supplierId: 2, expiryDate: "2026-06-20", status: "active", description: "For high blood pressure" },
    { id: 5, name: "Metformin 500mg", genericName: "Metformin HCl", category: "Diabetes", price: 18.50, stock: 180, reorderLevel: 20, unit: "tablet", supplierId: 3, expiryDate: "2026-03-10", status: "active", description: "Blood sugar control" },
    { id: 6, name: "Omeprazole 20mg", genericName: "Omeprazole", category: "Gastrointestinal", price: 25.00, stock: 100, reorderLevel: 10, unit: "capsule", supplierId: 3, expiryDate: "2025-09-01", status: "active", description: "Acid reflux treatment" },
    { id: 7, name: "Vitamin C 500mg", genericName: "Ascorbic Acid", category: "Vitamins", price: 6.00, stock: 600, reorderLevel: 60, unit: "tablet", supplierId: 1, expiryDate: "2027-01-15", status: "active", description: "Immune system support" },
    { id: 8, name: "Cetirizine 10mg", genericName: "Cetirizine HCl", category: "Antihistamine", price: 5.50, stock: 8, reorderLevel: 20, unit: "tablet", supplierId: 2, expiryDate: "2026-05-30", status: "active", description: "Allergy relief" },
  ],
  customers: [
    { id: 1, firstName: "Maria", lastName: "Santos", phone: "+63 912 345 6789", email: "maria@gmail.com", address: "Cebu City" },
    { id: 2, firstName: "Jose", lastName: "Reyes", phone: "+63 917 654 3210", email: "jose@yahoo.com", address: "Mandaue City" },
    { id: 3, firstName: "Ana", lastName: "Dela Cruz", phone: "+63 919 111 2233", email: "ana@gmail.com", address: "Lapu-Lapu City" },
  ],
  employees: [
    { id: 1, firstName: "Rosa", lastName: "Aquino", position: "Pharmacist", phone: "+63 912 100 2000", email: "rosa@pharmacy.ph", status: "active", hiredAt: "2022-01-15" },
    { id: 2, firstName: "Pedro", lastName: "Bautista", position: "Cashier", phone: "+63 917 200 3000", email: "pedro@pharmacy.ph", status: "active", hiredAt: "2023-06-01" },
  ],
  sales: [
    { id: 1, receiptNumber: "RX-20260401-1234", customerId: 1, items: [{ medicineId: 1, medicineName: "Biogesic", quantity: 10, unitPrice: 8.50, subtotal: 85 }, { medicineId: 7, medicineName: "Vitamin C 500mg", quantity: 5, unitPrice: 6.00, subtotal: 30 }], subTotal: 115, discount: 0, total: 115, paymentMethod: "cash", amountPaid: 200, change: 85, status: "completed", createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, receiptNumber: "RX-20260401-5678", customerId: 2, items: [{ medicineId: 3, medicineName: "Amoxicillin 500mg", quantity: 14, unitPrice: 15.75, subtotal: 220.5 }], subTotal: 220.5, discount: 20, total: 200.5, paymentMethod: "gcash", amountPaid: 200.5, change: 0, status: "completed", createdAt: new Date(Date.now() - 7200000).toISOString() },
  ],
  stockMovements: [
    { id: 1, medicineId: 1, medicineName: "Biogesic", type: "in", quantity: 500, reason: "Initial stock", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 2, medicineId: 8, medicineName: "Cetirizine 10mg", type: "out", quantity: 12, reason: "Sale RX-20260401-9999", createdAt: new Date(Date.now() - 43200000).toISOString() },
  ],
};

// ── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = n => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—";
const fmtDT = d => d ? new Date(d).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const CAT_ICONS = { Analgesic: "💊", "Cold & Flu": "🤧", Antibiotic: "🦠", Cardiovascular: "❤️", Diabetes: "🩸", Gastrointestinal: "🫀", Vitamins: "🌟", Antihistamine: "🌿", Other: "💉" };

// ── STYLES ────────────────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("pms-styles")) return;
  const style = document.createElement("style");
  style.id = "pms-styles";
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
    .pms * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Sora', sans-serif; }
    .pms { display: flex; height: 100vh; background: #f0f4f8; overflow: hidden; font-size: 14px; color: #0f172a; }

    /* LOGIN */
    .pms-login { position: fixed; inset: 0; background: linear-gradient(135deg, #0f172a 0%, #1a3a5c 50%, #0f172a 100%); display: flex; align-items: center; justify-content: center; z-index: 999; }
    .pms-login-orbs { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
    .pms-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.25; animation: pmsFloat 8s ease-in-out infinite; }
    .pms-orb-1 { width: 400px; height: 400px; background: #0ea5e9; top: -100px; right: -100px; }
    .pms-orb-2 { width: 300px; height: 300px; background: #06b6d4; bottom: -50px; left: -50px; animation-delay: -3s; }
    .pms-orb-3 { width: 200px; height: 200px; background: #6366f1; top: 50%; left: 40%; animation-delay: -5s; }
    @keyframes pmsFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-24px); } }
    .pms-login-card { position: relative; z-index: 1; background: rgba(255,255,255,0.06); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 44px; width: 420px; color: white; }
    .pms-login-logo { display: flex; align-items: center; gap: 14px; margin-bottom: 36px; }
    .pms-cross { width: 44px; height: 44px; background: linear-gradient(135deg, #0ea5e9, #06b6d4); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pms-login-brand { font-size: 19px; font-weight: 800; }
    .pms-login-sub { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 1px; }
    .pms-login-title { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
    .pms-login-desc { color: rgba(255,255,255,0.55); font-size: 13.5px; margin-bottom: 28px; }
    .pms-login-err { background: rgba(239,68,68,0.18); border: 1px solid rgba(239,68,68,0.35); border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 13px; color: #fca5a5; }
    .pms-fg { margin-bottom: 16px; }
    .pms-fg label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px; color: rgba(255,255,255,0.75); }
    .pms-fg input { width: 100%; background: rgba(255,255,255,0.09); border: 1px solid rgba(255,255,255,0.18); border-radius: 10px; padding: 12px 14px; color: white; font-size: 14px; font-family: 'Sora', sans-serif; outline: none; transition: border-color .2s; }
    .pms-fg input::placeholder { color: rgba(255,255,255,0.35); }
    .pms-fg input:focus { border-color: #0ea5e9; }
    .pms-login-btn { width: 100%; background: linear-gradient(135deg, #0ea5e9, #06b6d4); border: none; border-radius: 10px; padding: 13px; color: white; font-size: 15px; font-weight: 700; cursor: pointer; font-family: 'Sora', sans-serif; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 6px; transition: transform .15s, box-shadow .15s; }
    .pms-login-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(14,165,233,0.4); }
    .pms-login-hint { text-align: center; font-size: 11.5px; color: rgba(255,255,255,0.35); margin-top: 16px; font-family: 'DM Mono', monospace; }

    /* SIDEBAR */
    .pms-sidebar { width: 240px; background: #0f172a; height: 100vh; display: flex; flex-direction: column; flex-shrink: 0; overflow: hidden; transition: width .3s ease; }
    .pms-sidebar.collapsed { width: 60px; }
    .pms-sidebar-hdr { padding: 18px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .pms-sidebar-logo { display: flex; align-items: center; gap: 10px; overflow: hidden; }
    .pms-logo-sm { width: 32px; height: 32px; background: linear-gradient(135deg, #0ea5e9, #06b6d4); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pms-sidebar-brand { font-size: 16px; font-weight: 800; color: white; white-space: nowrap; }
    .collapsed .pms-sidebar-brand, .collapsed .pms-nav-lbl, .collapsed .pms-nav-txt, .collapsed .pms-nav-badge, .collapsed .pms-user-name, .collapsed .pms-user-role { display: none; }
    .pms-toggle { background: none; border: none; color: rgba(255,255,255,0.5); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; transition: background .15s; }
    .pms-toggle:hover { background: rgba(255,255,255,0.08); color: white; }
    .pms-nav-lbl { font-size: 10px; font-weight: 700; letter-spacing: .08em; color: rgba(255,255,255,0.28); padding: 16px 20px 5px; white-space: nowrap; }
    .pms-nav-list { list-style: none; padding: 0 8px; }
    .pms-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; color: rgba(255,255,255,0.55); font-size: 13.5px; font-weight: 500; cursor: pointer; transition: all .15s; white-space: nowrap; user-select: none; }
    .pms-nav-item:hover { background: rgba(255,255,255,0.07); color: white; }
    .pms-nav-item.active { background: rgba(14,165,233,0.18); color: #38bdf8; }
    .pms-nav-badge { margin-left: auto; background: #0ea5e9; color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .pms-sidebar-footer { margin-top: auto; padding: 12px; border-top: 1px solid rgba(255,255,255,0.06); }
    .pms-user-row { display: flex; align-items: center; gap: 10px; }
    .pms-avatar { width: 34px; height: 34px; background: linear-gradient(135deg, #0ea5e9, #06b6d4); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: white; font-size: 14px; flex-shrink: 0; }
    .pms-user-name { font-size: 13px; font-weight: 600; color: white; }
    .pms-user-role { font-size: 11px; color: rgba(255,255,255,0.35); }
    .pms-logout { margin-left: auto; background: none; border: none; color: rgba(255,255,255,0.35); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; transition: all .15s; flex-shrink: 0; }
    .pms-logout:hover { background: rgba(239,68,68,0.2); color: #f87171; }

    /* MAIN */
    .pms-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .pms-topbar { height: 60px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; padding: 0 22px; flex-shrink: 0; }
    .pms-topbar-l { display: flex; align-items: center; gap: 14px; }
    .pms-page-title { font-size: 16px; font-weight: 800; color: #0f172a; }
    .pms-topbar-r { display: flex; align-items: center; gap: 12px; }
    .pms-clock { font-size: 12px; color: #94a3b8; font-family: 'DM Mono', monospace; }
    .pms-bell { position: relative; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #64748b; cursor: pointer; transition: background .15s; }
    .pms-bell:hover { background: #f1f5f9; color: #f59e0b; }
    .pms-bell-count { position: absolute; top: 2px; right: 2px; background: #ef4444; color: white; font-size: 9px; font-weight: 800; width: 15px; height: 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .pms-content { flex: 1; overflow-y: auto; padding: 24px; }

    /* CARDS */
    .pms-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .pms-card-hdr { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 0; }
    .pms-card-title { font-size: 14.5px; font-weight: 700; }
    .pms-card-body { padding: 16px 20px 20px; }
    .pms-card-body.no-pad { padding: 0; }

    /* STATS */
    .pms-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 22px; }
    .pms-stat { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; display: flex; align-items: flex-start; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: transform .15s, box-shadow .15s; }
    .pms-stat:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .pms-stat-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    .pms-stat-icon.blue { background: #e0f2fe; }
    .pms-stat-icon.green { background: #d1fae5; }
    .pms-stat-icon.orange { background: #fef3c7; }
    .pms-stat-icon.red { background: #fee2e2; }
    .pms-stat-icon.purple { background: #ede9fe; }
    .pms-stat-lbl { font-size: 11.5px; color: #94a3b8; font-weight: 600; margin-bottom: 4px; }
    .pms-stat-val { font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1; }
    .pms-stat-sub { font-size: 11px; color: #94a3b8; margin-top: 4px; }

    /* PAGE HEADER */
    .pms-ph { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .pms-ph h1 { font-size: 22px; font-weight: 800; }
    .pms-ph p { font-size: 13px; color: #64748b; margin-top: 2px; }
    .pms-ph-actions { display: flex; gap: 8px; align-items: center; }

    /* BUTTONS */
    .btn-p { background: #0ea5e9; border: none; border-radius: 8px; padding: 9px 16px; color: white; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Sora', sans-serif; display: inline-flex; align-items: center; gap: 6px; transition: background .15s, transform .1s; }
    .btn-p:hover { background: #0284c7; transform: translateY(-1px); }
    .btn-o { background: none; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 16px; color: #475569; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Sora', sans-serif; display: inline-flex; align-items: center; gap: 6px; transition: all .15s; }
    .btn-o:hover { border-color: #0ea5e9; color: #0ea5e9; background: #e0f2fe; }
    .btn-d { background: #ef4444; border: none; border-radius: 8px; padding: 9px 16px; color: white; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Sora', sans-serif; }
    .btn-d:hover { background: #dc2626; }
    .btn-sm { padding: 5px 10px; font-size: 12px; border-radius: 6px; }
    .btn-icon { width: 30px; height: 30px; border-radius: 6px; border: 1px solid #e2e8f0; background: white; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; transition: all .15s; }
    .btn-icon:hover { border-color: #0ea5e9; background: #e0f2fe; }
    .btn-icon.danger:hover { border-color: #ef4444; background: #fee2e2; }

    /* BADGES */
    .bdg { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .bdg-green { background: #d1fae5; color: #065f46; }
    .bdg-red { background: #fee2e2; color: #991b1b; }
    .bdg-orange { background: #fef3c7; color: #92400e; }
    .bdg-blue { background: #e0f2fe; color: #0369a1; }
    .bdg-gray { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .bdg-purple { background: #ede9fe; color: #5b21b6; }

    /* TABLE */
    .pms-tbl-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 10px 14px; font-size: 11px; font-weight: 700; letter-spacing: .05em; color: #94a3b8; text-transform: uppercase; background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; }
    tbody tr { border-bottom: 1px solid #f1f5f9; transition: background .1s; }
    tbody tr:hover { background: #f8fafc; }
    tbody tr:last-child { border-bottom: none; }
    tbody td { padding: 11px 14px; font-size: 13.5px; vertical-align: middle; }

    /* ALERTS */
    .pms-alert { padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
    .pms-alert-w { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .pms-alert-d { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

    /* FORM */
    .pms-fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .pms-fgrid.cols3 { grid-template-columns: 1fr 1fr 1fr; }
    .pms-fg-m { display: flex; flex-direction: column; gap: 5px; }
    .pms-fg-m label { font-size: 12px; font-weight: 700; color: #475569; }
    .pms-fg-m input, .pms-fg-m select, .pms-fg-m textarea { border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px; font-size: 13.5px; color: #0f172a; font-family: 'Sora', sans-serif; outline: none; transition: border-color .15s; width: 100%; }
    .pms-fg-m input:focus, .pms-fg-m select:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.1); }
    .col2 { grid-column: span 2; }

    /* MODAL */
    .pms-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 500; backdrop-filter: blur(2px); }
    .pms-modal { background: white; border-radius: 16px; width: 100%; max-width: 580px; max-height: 88vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: pmsUp .2s ease; }
    @keyframes pmsUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
    .pms-modal-hdr { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: white; z-index: 1; }
    .pms-modal-hdr h3 { font-size: 17px; font-weight: 800; }
    .pms-modal-close { background: none; border: none; cursor: pointer; color: #94a3b8; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 18px; transition: all .15s; }
    .pms-modal-close:hover { background: #f1f5f9; color: #0f172a; }
    .pms-modal-body { padding: 20px 24px; }
    .pms-modal-footer { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; justify-content: flex-end; }

    /* POS */
    .pms-pos { display: grid; grid-template-columns: 1fr 360px; gap: 16px; height: calc(100vh - 108px); }
    .pms-pos-prods { overflow-y: auto; padding-right: 4px; }
    .pms-prod-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 10px; }
    .pms-prod-card { background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 14px; cursor: pointer; transition: all .15s; }
    .pms-prod-card:hover { border-color: #0ea5e9; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(14,165,233,0.15); }
    .pms-prod-card.low { border-color: #fde68a; }
    .pms-prod-em { font-size: 28px; margin-bottom: 8px; }
    .pms-prod-name { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
    .pms-prod-gen { font-size: 11px; color: #94a3b8; margin-bottom: 8px; }
    .pms-prod-bot { display: flex; justify-content: space-between; align-items: center; }
    .pms-prod-price { font-size: 15px; font-weight: 800; color: #0ea5e9; }
    .pms-prod-stk { font-size: 11px; color: #64748b; }
    .pms-cart { display: flex; flex-direction: column; background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .pms-cart-hdr { padding: 16px; border-bottom: 1px solid #e2e8f0; }
    .pms-cart-hdr h3 { font-size: 15px; font-weight: 800; }
    .pms-cart-items { flex: 1; overflow-y: auto; }
    .pms-cart-item { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; }
    .pms-cart-iname { flex: 1; font-size: 13px; font-weight: 600; }
    .pms-cart-iprice { font-size: 11px; color: #94a3b8; }
    .pms-cart-qty { display: flex; align-items: center; gap: 5px; }
    .pms-qty-btn { width: 24px; height: 24px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; color: #0f172a; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; }
    .pms-qty-btn:hover { background: #0ea5e9; color: white; border-color: #0ea5e9; }
    .pms-qty-val { font-size: 13px; font-weight: 700; min-width: 20px; text-align: center; }
    .pms-cart-sub { font-size: 13px; font-weight: 700; min-width: 65px; text-align: right; }
    .pms-cart-empty { text-align: center; padding: 40px 16px; color: #94a3b8; font-size: 13px; }
    .pms-cart-sum { padding: 14px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
    .pms-sum-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; color: #475569; }
    .pms-sum-row input, .pms-sum-row select { padding: 5px 8px; font-size: 12px; font-family: 'Sora', sans-serif; border: 1px solid #e2e8f0; border-radius: 6px; outline: none; }
    .pms-sum-row.total { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
    .pms-checkout { width: 100%; margin-top: 12px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 8px; padding: 13px; color: white; font-size: 15px; font-weight: 800; cursor: pointer; font-family: 'Sora', sans-serif; transition: opacity .15s, transform .1s; }
    .pms-checkout:hover { opacity: .92; transform: translateY(-1px); }
    .pms-checkout:disabled { opacity: .45; cursor: not-allowed; transform: none; }

    /* RECEIPT */
    .pms-receipt { font-family: 'DM Mono', monospace; }
    .pms-receipt-hdr { text-align: center; margin-bottom: 14px; }
    .pms-receipt-logo { font-size: 17px; font-weight: 700; }
    .pms-rcpt-div { border: none; border-top: 1px dashed #e2e8f0; margin: 12px 0; }
    .pms-rcpt-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
    .pms-rcpt-row.bold { font-weight: 700; font-size: 13px; }
    .pms-rcpt-actions { padding: 16px; display: flex; gap: 8px; border-top: 1px solid #e2e8f0; }
    .pms-rcpt-actions button { flex: 1; }

    /* CHART */
    .pms-chart { display: flex; align-items: flex-end; gap: 6px; height: 100px; }
    .pms-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .pms-bar { width: 100%; background: linear-gradient(to top, #0ea5e9, #38bdf8); border-radius: 4px 4px 0 0; transition: height .5s ease; min-height: 4px; }
    .pms-bar-lbl { font-size: 10px; color: #94a3b8; }

    /* DASH GRID */
    .pms-dash-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-top: 20px; }

    /* MISC */
    .pms-empty { text-align: center; padding: 48px 20px; color: #94a3b8; }
    .pms-empty-icon { font-size: 44px; margin-bottom: 12px; }
    .pms-empty h3 { font-size: 15px; font-weight: 700; color: #64748b; margin-bottom: 6px; }
    .mono { font-family: 'DM Mono', monospace; font-size: 12px; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  `;
  document.head.appendChild(style);
};

// ── ICONS ─────────────────────────────────────────────────────────────────────
const I = {
  grid: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  bag: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  pill: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 2H5a2 2 0 00-2 2v18l4-2 4 2 4-2 4 2V4a2 2 0 00-2-2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg>,
  truck: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  box: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  users: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  team: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  chart: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  key: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>,
  bell: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  menu: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  logout: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  cross: <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><rect x="13" y="2" width="6" height="28" rx="3" fill="white"/><rect x="2" y="13" width="28" height="6" rx="3" fill="white"/></svg>,
  eye: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  edit: "✏️", del: "🗑️",
};

// ── APP ────────────────────────────────────────────────────────────────────────
export default function App() {
  injectStyles();
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [page, setPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modal, setModal] = useState(null); // { title, body }
  const [receipt, setReceipt] = useState(null);
  const [clock, setClock] = useState("");

  // DATA STATE
  const [medicines, setMedicines] = useState(SEED.medicines);
  const [suppliers, setSuppliers] = useState(SEED.suppliers);
  const [customers, setCustomers] = useState(SEED.customers);
  const [employees, setEmployees] = useState(SEED.employees);
  const [sales, setSales] = useState(SEED.sales);
  const [stockMovements, setStockMovements] = useState(SEED.stockMovements);
  const [users, setUsers] = useState(SEED.users);
  const [idCounter, setIdCounter] = useState(100);

  const nextId = useCallback(() => { setIdCounter(c => c + 1); return idCounter + 1; }, [idCounter]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleString("en-PH", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })), 1000);
    return () => clearInterval(t);
  }, []);

  const doLogin = () => {
    const u = users.find(x => x.username === loginUser && x.password === loginPass);
    if (!u) { setLoginErr("Invalid username or password."); return; }
    setCurrentUser(u.username); setLoggedIn(true); setLoginErr("");
  };

  const doLogout = () => { setLoggedIn(false); setCurrentUser(""); setPage("dashboard"); };
  const closeModal = () => setModal(null);
  const lowStockCount = medicines.filter(m => m.stock <= m.reorderLevel && m.status === "active").length;

  const NAV = [
    { section: "MAIN", items: [{ id: "dashboard", label: "Dashboard", icon: I.grid }, { id: "pos", label: "Point of Sale", icon: I.bag, badge: "POS" }] },
    { section: "INVENTORY", items: [{ id: "medicines", label: "Medicines", icon: I.pill }, { id: "suppliers", label: "Suppliers", icon: I.truck }, { id: "stock", label: "Stock", icon: I.box }] },
    { section: "PEOPLE", items: [{ id: "customers", label: "Customers", icon: I.users }, { id: "employees", label: "Employees", icon: I.team }] },
    { section: "REPORTS", items: [{ id: "sales", label: "Sales History", icon: I.chart }] },
    { section: "SYSTEM", items: [{ id: "users", label: "User Accounts", icon: I.key }] },
  ];

  if (!loggedIn) return (
    <div className="pms-login">
      <div className="pms-login-orbs"><div className="pms-orb pms-orb-1"/><div className="pms-orb pms-orb-2"/><div className="pms-orb pms-orb-3"/></div>
      <div className="pms-login-card">
        <div className="pms-login-logo">
          <div className="pms-cross" style={{width:44,height:44,background:"linear-gradient(135deg,#0ea5e9,#06b6d4)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{I.cross}</div>
          <div><div className="pms-login-brand">MediCare PMS</div><div className="pms-login-sub">Pharmacy Management System</div></div>
        </div>
        <h2 className="pms-login-title">Welcome back</h2>
        <p className="pms-login-desc">Sign in to your admin account to continue</p>
        {loginErr && <div className="pms-login-err">⚠️ {loginErr}</div>}
        <div className="pms-fg"><label>Username</label><input value={loginUser} onChange={e=>setLoginUser(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Enter username"/></div>
        <div className="pms-fg"><label>Password</label><input type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Enter password"/></div>
        <button className="pms-login-btn" onClick={doLogin}>Sign In →</button>

      </div>
    </div>
  );

  return (
    <div className="pms">
      {/* SIDEBAR */}
      <nav className={`pms-sidebar${sidebarCollapsed?" collapsed":""}`}>
        <div className="pms-sidebar-hdr">
          <div className="pms-sidebar-logo">
            <div className="pms-logo-sm">{I.cross}</div>
            <span className="pms-sidebar-brand">MediCare</span>
          </div>
          <button className="pms-toggle" onClick={()=>setSidebarCollapsed(c=>!c)}>{I.menu}</button>
        </div>
        {NAV.map(section => (
          <div key={section.section}>
            <div className="pms-nav-lbl">{section.section}</div>
            <ul className="pms-nav-list">
              {section.items.map(item => (
                <li key={item.id}>
                  <div className={`pms-nav-item${page===item.id?" active":""}`} onClick={()=>setPage(item.id)}>
                    {item.icon}
                    <span className="pms-nav-txt">{item.label}</span>
                    {item.badge && <span className="pms-nav-badge">{item.badge}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="pms-sidebar-footer">
          <div className="pms-user-row">
            <div className="pms-avatar">{currentUser.charAt(0).toUpperCase()}</div>
            <div><div className="pms-user-name">{currentUser}</div><div className="pms-user-role">Administrator</div></div>
            <button className="pms-logout" onClick={doLogout} title="Logout">{I.logout}</button>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="pms-main">
        <div className="pms-topbar">
          <div className="pms-topbar-l">
            <button className="pms-toggle" style={{color:"#64748b"}} onClick={()=>setSidebarCollapsed(c=>!c)}>{I.menu}</button>
            <span className="pms-page-title">{{dashboard:"Dashboard",pos:"Point of Sale",medicines:"Medicines",suppliers:"Suppliers",stock:"Stock Management",customers:"Customers",employees:"Employees",sales:"Sales History",users:"User Accounts"}[page]}</span>
          </div>
          <div className="pms-topbar-r">
            <span className="pms-clock">{clock}</span>
            <div className="pms-bell" onClick={()=>setPage("stock")} title="Low stock alerts">
              {I.bell}
              {lowStockCount > 0 && <span className="pms-bell-count">{lowStockCount}</span>}
            </div>
          </div>
        </div>

        <div className="pms-content">
          {page === "dashboard" && <DashboardPage medicines={medicines} sales={sales} customers={customers} setPage={setPage} />}
          {page === "pos" && <POSPage medicines={medicines} setMedicines={setMedicines} customers={customers} sales={sales} setSales={setSales} setStockMovements={setStockMovements} setReceipt={setReceipt} nextId={nextId} />}
          {page === "medicines" && <MedicinesPage medicines={medicines} setMedicines={setMedicines} suppliers={suppliers} setModal={setModal} nextId={nextId} />}
          {page === "suppliers" && <SuppliersPage suppliers={suppliers} setSuppliers={setSuppliers} medicines={medicines} setModal={setModal} nextId={nextId} />}
          {page === "stock" && <StockPage medicines={medicines} setMedicines={setMedicines} stockMovements={stockMovements} setStockMovements={setStockMovements} setModal={setModal} nextId={nextId} />}
          {page === "customers" && <CustomersPage customers={customers} setCustomers={setCustomers} sales={sales} setModal={setModal} nextId={nextId} />}
          {page === "employees" && <EmployeesPage employees={employees} setEmployees={setEmployees} setModal={setModal} nextId={nextId} />}
          {page === "sales" && <SalesPage sales={sales} customers={customers} medicines={medicines} setModal={setModal} />}
          {page === "users" && <UsersPage users={users} setUsers={setUsers} setModal={setModal} nextId={nextId} />}
        </div>
      </main>

      {/* MODAL */}
      {modal && (
        <div className="pms-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="pms-modal">
            <div className="pms-modal-hdr">
              <h3>{modal.title}</h3>
              <button className="pms-modal-close" onClick={closeModal}>✕</button>
            </div>
            {modal.body}
          </div>
        </div>
      )}

      {/* RECEIPT */}
      {receipt && (
        <div className="pms-overlay" onClick={e=>e.target===e.currentTarget&&setReceipt(null)}>
          <div className="pms-modal" style={{maxWidth:360}}>
            <div className="pms-modal-hdr"><h3>🧾 Receipt</h3><button className="pms-modal-close" onClick={()=>setReceipt(null)}>✕</button></div>
            <div className="pms-modal-body pms-receipt">
              <div className="pms-receipt-hdr">
                <div className="pms-receipt-logo">💊 MediCare PMS</div>
                <div style={{fontSize:11,color:"#64748b"}}>Official Receipt</div>
                <div style={{fontSize:11,color:"#64748b"}}>{new Date().toLocaleString("en-PH")}</div>
              </div>
              <hr className="pms-rcpt-div"/>
              <div className="pms-rcpt-row bold"><span>Receipt #:</span><span>{receipt.receiptNumber}</span></div>
              <div className="pms-rcpt-row"><span>Customer:</span><span>{receipt.customerName}</span></div>
              <hr className="pms-rcpt-div"/>
              {receipt.items.map((item,i) => (
                <div key={i} style={{marginBottom:6}}>
                  <div style={{fontSize:12,fontWeight:700}}>{item.medicineName}</div>
                  <div className="pms-rcpt-row" style={{fontSize:11,color:"#64748b"}}>
                    <span>{item.quantity} × {fmt(item.unitPrice)}</span>
                    <span>{fmt(item.subtotal)}</span>
                  </div>
                </div>
              ))}
              <hr className="pms-rcpt-div"/>
              <div className="pms-rcpt-row"><span>Subtotal</span><span>{fmt(receipt.subTotal)}</span></div>
              <div className="pms-rcpt-row"><span>Discount</span><span>−{fmt(receipt.discount)}</span></div>
              <div className="pms-rcpt-row bold"><span>TOTAL</span><span>{fmt(receipt.total)}</span></div>
              <div className="pms-rcpt-row"><span>Paid ({receipt.paymentMethod})</span><span>{fmt(receipt.amountPaid)}</span></div>
              <div className="pms-rcpt-row" style={{color:"#10b981",fontWeight:700}}><span>Change</span><span>{fmt(receipt.change)}</span></div>
              <hr className="pms-rcpt-div"/>
              <div style={{textAlign:"center",fontSize:11,color:"#94a3b8"}}>Thank you for your purchase!<br/>Please keep this receipt.</div>
            </div>
            <div className="pms-rcpt-actions">
              <button className="btn-o" onClick={()=>setReceipt(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────────
function DashboardPage({ medicines, sales, customers, setPage }) {
  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === today);
  const todayRevenue = todaySales.reduce((s, x) => s + x.total, 0);
  const lowStock = medicines.filter(m => m.stock <= m.reorderLevel && m.status === "active");
  const expiringSoon = medicines.filter(m => new Date(m.expiryDate) <= new Date(Date.now() + 30*86400000) && m.status === "active");
  const allRevenue = sales.reduce((s,x) => s + x.total, 0);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthData = Array.from({length:6}, (_,i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5-i));
    const mo = sales.filter(s => { const sd = new Date(s.createdAt); return sd.getMonth()===d.getMonth()&&sd.getFullYear()===d.getFullYear(); });
    return { label: months[d.getMonth()], total: mo.reduce((s,x)=>s+x.total,0) };
  });
  const maxMo = Math.max(...monthData.map(m=>m.total), 1);

  return (
    <div>
      <div className="pms-ph">
        <div><h1>Dashboard</h1><p>Welcome back! Here's what's happening today.</p></div>
        <button className="btn-p" onClick={()=>setPage("pos")}>{I.plus} New Sale</button>
      </div>
      {lowStock.length > 0 && <div className="pms-alert pms-alert-w">⚠️ <strong>{lowStock.length} medicine(s)</strong> are running low on stock.</div>}
      {expiringSoon.length > 0 && <div className="pms-alert pms-alert-d">🗓️ <strong>{expiringSoon.length} medicine(s)</strong> expiring within 30 days.</div>}
      <div className="pms-stats">
        <div className="pms-stat"><div className="pms-stat-icon blue">💰</div><div><div className="pms-stat-lbl">Today's Revenue</div><div className="pms-stat-val">{fmt(todayRevenue)}</div><div className="pms-stat-sub">{todaySales.length} sale(s)</div></div></div>
        <div className="pms-stat"><div className="pms-stat-icon green">💊</div><div><div className="pms-stat-lbl">Medicines</div><div className="pms-stat-val">{medicines.length}</div><div className="pms-stat-sub">In inventory</div></div></div>
        <div className="pms-stat"><div className="pms-stat-icon orange">⚠️</div><div><div className="pms-stat-lbl">Low Stock</div><div className="pms-stat-val">{lowStock.length}</div><div className="pms-stat-sub">Need reorder</div></div></div>
        <div className="pms-stat"><div className="pms-stat-icon purple">👥</div><div><div className="pms-stat-lbl">Customers</div><div className="pms-stat-val">{customers.length}</div><div className="pms-stat-sub">Registered</div></div></div>
        <div className="pms-stat"><div className="pms-stat-icon red">📅</div><div><div className="pms-stat-lbl">Expiring Soon</div><div className="pms-stat-val">{expiringSoon.length}</div><div className="pms-stat-sub">Within 30 days</div></div></div>
      </div>
      <div className="pms-dash-grid">
        <div className="pms-card">
          <div className="pms-card-hdr"><span className="pms-card-title">Recent Sales</span><button className="btn-o btn-sm" onClick={()=>setPage("sales")}>View All</button></div>
          <div className="pms-card-body no-pad">
            <div className="pms-tbl-wrap">
              <table>
                <thead><tr><th>Receipt #</th><th>Customer</th><th>Total</th><th>Payment</th><th>Time</th></tr></thead>
                <tbody>
                  {sales.slice().reverse().slice(0,5).map(s => {
                    const cust = customers.find(c=>c.id===s.customerId);
                    return <tr key={s.id}>
                      <td><span className="mono">{s.receiptNumber}</span></td>
                      <td>{cust ? `${cust.firstName} ${cust.lastName}` : "Walk-in"}</td>
                      <td style={{fontWeight:700}}>{fmt(s.total)}</td>
                      <td><span className="bdg bdg-blue">{s.paymentMethod}</span></td>
                      <td style={{color:"#94a3b8",fontSize:12}}>{fmtDT(s.createdAt)}</td>
                    </tr>;
                  })}
                  {sales.length === 0 && <tr><td colSpan={5}><div className="pms-empty"><div className="pms-empty-icon">📋</div><p>No sales yet</p></div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="pms-card">
          <div className="pms-card-hdr"><span className="pms-card-title">Monthly Revenue</span></div>
          <div className="pms-card-body">
            <div className="pms-chart">
              {monthData.map((m,i) => (
                <div key={i} className="pms-bar-wrap">
                  <div className="pms-bar" style={{height:`${Math.max(4,(m.total/maxMo)*96)}px`}} title={fmt(m.total)}/>
                  <div className="pms-bar-lbl">{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,fontSize:12,color:"#64748b"}}>Total: <strong style={{color:"#0f172a"}}>{fmt(allRevenue)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── POS ────────────────────────────────────────────────────────────────────────
function POSPage({ medicines, setMedicines, customers, sales, setSales, setStockMovements, setReceipt, nextId }) {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [payment, setPayment] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [amtPaid, setAmtPaid] = useState(0);
  
  const filtered = medicines.filter(m => m.status === "active" && m.stock > 0 && (
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.genericName.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase())
  ));

  const addToCart = (med) => {
    setCart(prev => {
      const ex = prev.find(i=>i.id===med.id);
      if (ex) {
        if (ex.qty >= med.stock) { alert(`Only ${med.stock} available`); return prev; }
        return prev.map(i=>i.id===med.id?{...i,qty:i.qty+1}:i);
      }
      return [...prev, { id:med.id, name:med.name, price:med.price, qty:1, stock:med.stock, unit:med.unit }];
    });
  };

  const updateQty = (id, d) => setCart(prev => {
    const item = prev.find(i=>i.id===id);
    if (!item) return prev;
    const newQty = item.qty + d;
    if (newQty <= 0) return prev.filter(i=>i.id!==id);
    if (newQty > item.stock) { alert(`Only ${item.stock} available`); return prev; }
    return prev.map(i=>i.id===id?{...i,qty:newQty}:i);
  });

  const subtotal = cart.reduce((s,i)=>s+i.price*i.qty, 0);
  const total = Math.max(0, subtotal - Number(discount));
  const change = Math.max(0, Number(amtPaid) - total);

  const checkout = () => {
    if (cart.length === 0) return;
    if (Number(amtPaid) < total) { alert("Amount paid is less than total!"); return; }
    const receiptNumber = `RX-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.floor(Math.random()*9000)+1000}`;
    const cust = customers.find(c=>c.id===Number(customerId));
    const saleItems = cart.map(i => ({ medicineId:i.id, medicineName:i.name, quantity:i.qty, unitPrice:i.price, subtotal:i.price*i.qty }));
    const newSale = { id: Date.now(), receiptNumber, customerId: customerId?Number(customerId):null, items: saleItems, subTotal: subtotal, discount: Number(discount), total, paymentMethod: payment, amountPaid: Number(amtPaid), change, status:"completed", createdAt: new Date().toISOString() };
    setSales(prev => [...prev, newSale]);
    setMedicines(prev => prev.map(m => {
      const ci = cart.find(i=>i.id===m.id);
      return ci ? {...m, stock: m.stock - ci.qty} : m;
    }));
    setStockMovements(prev => [...prev, ...cart.map(i => ({ id:Date.now()+i.id, medicineId:i.id, medicineName:i.name, type:"out", quantity:i.qty, reason:`Sale ${receiptNumber}`, createdAt: new Date().toISOString() }))]);
    setReceipt({ receiptNumber, customerName: cust?`${cust.firstName} ${cust.lastName}`:"Walk-in", items: saleItems, subTotal: subtotal, discount: Number(discount), total, paymentMethod: payment, amountPaid: Number(amtPaid), change });
    setCart([]); setDiscount(0); setAmtPaid(0); setCustomerId(""); setPayment("cash");
  };

  return (
    <div className="pms-pos">
      <div className="pms-pos-prods">
        <div style={{marginBottom:12}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search medicines by name, generic, or category..." style={{width:"100%",borderRadius:10,border:"1px solid #e2e8f0",padding:"10px 14px",fontSize:14,fontFamily:"'Sora',sans-serif",outline:"none"}}/>
        </div>
        <div className="pms-prod-grid">
          {filtered.map(m => (
            <div key={m.id} className={`pms-prod-card${m.stock<=m.reorderLevel?" low":""}`} onClick={()=>addToCart(m)}>
              <div className="pms-prod-em">{CAT_ICONS[m.category]||"💊"}</div>
              <div className="pms-prod-name">{m.name}</div>
              <div className="pms-prod-gen">{m.genericName}</div>
              <div className="pms-prod-bot">
                <div className="pms-prod-price">{fmt(m.price)}</div>
                <span className={`bdg ${m.stock<=m.reorderLevel?"bdg-orange":"bdg-green"}`} style={{fontSize:10}}>{m.stock}</span>
              </div>
            </div>
          ))}
          {filtered.length===0 && <div className="pms-empty" style={{gridColumn:"1/-1"}}><div className="pms-empty-icon">🔍</div><p>No medicines found</p></div>}
        </div>
      </div>
      <div className="pms-cart">
        <div className="pms-cart-hdr">
          <h3>🛒 Cart</h3>
          <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{cart.length} item(s)</div>
        </div>
        <div className="pms-cart-items">
          {cart.length===0 ? <div className="pms-cart-empty">🛒<br/>Cart is empty<br/><small>Click a medicine to add</small></div> :
            cart.map(item => (
              <div key={item.id} className="pms-cart-item">
                <div style={{flex:1}}>
                  <div className="pms-cart-iname">{item.name}</div>
                  <div className="pms-cart-iprice">{fmt(item.price)} / {item.unit}</div>
                </div>
                <div className="pms-cart-qty">
                  <button className="pms-qty-btn" onClick={()=>updateQty(item.id,-1)}>−</button>
                  <span className="pms-qty-val">{item.qty}</span>
                  <button className="pms-qty-btn" onClick={()=>updateQty(item.id,1)}>+</button>
                </div>
                <div className="pms-cart-sub">{fmt(item.price*item.qty)}</div>
                <button className="btn-icon danger" onClick={()=>setCart(p=>p.filter(i=>i.id!==item.id))}>🗑️</button>
              </div>
            ))
          }
        </div>
        <div className="pms-cart-sum">
          <div className="pms-sum-row"><span>Customer</span>
            <select value={customerId} onChange={e=>setCustomerId(e.target.value)} style={{width:160}}>
              <option value="">Walk-in</option>
              {customers.map(c=><option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </select>
          </div>
          <div className="pms-sum-row"><span>Payment</span>
            <select value={payment} onChange={e=>setPayment(e.target.value)}>
              <option value="cash">Cash</option><option value="gcash">GCash</option><option value="maya">Maya</option><option value="card">Card</option>
            </select>
          </div>
          <div className="pms-sum-row"><span>Subtotal</span><span style={{fontWeight:600}}>{fmt(subtotal)}</span></div>
          <div className="pms-sum-row"><span>Discount (₱)</span><input type="number" value={discount} onChange={e=>setDiscount(e.target.value)} min="0" style={{width:90,textAlign:"right"}}/></div>
          <div className="pms-sum-row total"><span>TOTAL</span><span>{fmt(total)}</span></div>
          <div className="pms-sum-row"><span>Amount Paid</span><input type="number" value={amtPaid} onChange={e=>setAmtPaid(e.target.value)} min="0" style={{width:110,textAlign:"right"}}/></div>
          <div className="pms-sum-row" style={{color:"#10b981",fontWeight:700}}><span>Change</span><span>{fmt(change)}</span></div>
          <button className="pms-checkout" onClick={checkout} disabled={cart.length===0}>✓ Checkout — {fmt(total)}</button>
          <button className="btn-o" style={{width:"100%",marginTop:8,justifyContent:"center"}} onClick={()=>setCart([])}>Clear Cart</button>
        </div>
      </div>
    </div>
  );
}

// ── MEDICINES ──────────────────────────────────────────────────────────────────
function MedicinesPage({ medicines, setMedicines, suppliers, setModal, nextId }) {
  const [search, setSearch] = useState("");
  const filtered = medicines.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.genericName.toLowerCase().includes(search.toLowerCase()));
  const lowCount = medicines.filter(m=>m.stock<=m.reorderLevel&&m.status==="active").length;

  const openForm = (med=null) => {
    let form = { name:med?.name||"", genericName:med?.genericName||"", category:med?.category||"Analgesic", price:med?.price||"", stock:med?.stock||0, reorderLevel:med?.reorderLevel||10, unit:med?.unit||"tablet", supplierId:med?.supplierId||"", expiryDate:med?.expiryDate||"", status:med?.status||"active", description:med?.description||"" };
    const CATS = ["Analgesic","Antibiotic","Antihistamine","Cardiovascular","Cold & Flu","Diabetes","Gastrointestinal","Vitamins","Other"];
    const UNITS = ["tablet","capsule","bottle","sachet","pcs","ml","mg"];
    const F = ({label,id,type="text",opts,value,onChange,col2}) => (
      <div className={`pms-fg-m${col2?" col2":""}`}>
        <label>{label}</label>
        {opts ? <select value={value} onChange={onChange}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>
               : <input type={type} value={value} onChange={onChange} style={id==="price"?{fontFamily:"'DM Mono',monospace"}:{}}/>}
      </div>
    );
    const render = (f) => (
      <div>
        <div className="pms-modal-body">
          <div className="pms-fgrid">
            <F col2 label="Medicine Name *" value={f.name} onChange={e=>{f.name=e.target.value;render(f);}}/>
            <F label="Generic Name *" value={f.genericName} onChange={e=>{f.genericName=e.target.value;render(f);}}/>
            <F label="Category" opts={CATS} value={f.category} onChange={e=>{f.category=e.target.value;render(f);}}/>
            <F label="Price (₱) *" type="number" value={f.price} onChange={e=>{f.price=e.target.value;render(f);}}/>
            <F label="Stock" type="number" value={f.stock} onChange={e=>{f.stock=e.target.value;render(f);}}/>
            <F label="Reorder Level" type="number" value={f.reorderLevel} onChange={e=>{f.reorderLevel=e.target.value;render(f);}}/>
            <F label="Unit" opts={UNITS} value={f.unit} onChange={e=>{f.unit=e.target.value;render(f);}}/>
            <div className="pms-fg-m"><label>Supplier</label>
              <select value={f.supplierId} onChange={e=>{f.supplierId=e.target.value;render(f);}}>
                <option value="">— None —</option>
                {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <F label="Expiry Date *" type="date" value={f.expiryDate} onChange={e=>{f.expiryDate=e.target.value;render(f);}}/>
            {med && <F label="Status" opts={["active","inactive"]} value={f.status} onChange={e=>{f.status=e.target.value;render(f);}}/>}
            <F col2 label="Description" value={f.description} onChange={e=>{f.description=e.target.value;render(f);}}/>
          </div>
        </div>
        <div className="pms-modal-footer">
          <button className="btn-o" onClick={()=>setModal(null)}>Cancel</button>
          <button className="btn-p" onClick={()=>save(f)}>{med?"Save Changes":"Add Medicine"}</button>
        </div>
      </div>
    );
    const save = (f) => {
      if (!f.name||!f.genericName||!f.price||!f.expiryDate) { alert("Fill required fields"); return; }
      if (med) {
        setMedicines(p=>p.map(m=>m.id===med.id?{...m,...f,price:parseFloat(f.price),stock:parseInt(f.stock),reorderLevel:parseInt(f.reorderLevel),supplierId:f.supplierId?parseInt(f.supplierId):null}:m));
      } else {
        const id = Date.now();
        setMedicines(p=>[...p,{id,...f,price:parseFloat(f.price),stock:parseInt(f.stock),reorderLevel:parseInt(f.reorderLevel),supplierId:f.supplierId?parseInt(f.supplierId):null}]);
      }
      setModal(null);
    };
    setModal({ title: med?"Edit Medicine":"Add Medicine", body: render(form) });
  };

  return (
    <div>
      <div className="pms-ph">
        <div><h1>Medicines</h1><p>{medicines.length} medicine(s) · {lowCount} low stock</p></div>
        <button className="btn-p" onClick={()=>openForm()}>{I.plus} Add Medicine</button>
      </div>
      <div style={{marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search medicines..." style={{borderRadius:8,border:"1px solid #e2e8f0",padding:"9px 14px",fontSize:13,fontFamily:"'Sora',sans-serif",outline:"none",width:280}}/>
      </div>
      <div className="pms-card"><div className="pms-card-body no-pad"><div className="pms-tbl-wrap">
        <table>
          <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Supplier</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(m => {
              const sup = suppliers.find(s=>s.id===m.supplierId);
              const isLow = m.stock <= m.reorderLevel;
              return <tr key={m.id}>
                <td><div style={{fontWeight:700}}>{m.name}</div><div style={{fontSize:11,color:"#94a3b8"}}>{m.genericName}</div></td>
                <td><span className="bdg bdg-blue">{m.category}</span></td>
                <td style={{fontFamily:"'DM Mono',monospace",fontWeight:600}}>{fmt(m.price)}</td>
                <td><span className={`bdg ${isLow?"bdg-orange":"bdg-green"}`}>{m.stock} {m.unit}</span></td>
                <td style={{fontSize:12,color:"#64748b"}}>{sup?.name||"—"}</td>
                <td style={{fontSize:12,color:"#64748b"}}>{fmtDate(m.expiryDate)}</td>
                <td><span className={`bdg ${m.status==="active"?"bdg-green":"bdg-gray"}`}>{m.status}</span></td>
                <td><div style={{display:"flex",gap:4}}>
                  <button className="btn-icon" onClick={()=>openForm(m)}>✏️</button>
                  <button className="btn-icon danger" onClick={()=>{if(confirm(`Deactivate "${m.name}"?`))setMedicines(p=>p.map(x=>x.id===m.id?{...x,status:"inactive"}:x))}}>🗑️</button>
                </div></td>
              </tr>;
            })}
            {filtered.length===0&&<tr><td colSpan={8}><div className="pms-empty"><div className="pms-empty-icon">💊</div><h3>No medicines found</h3></div></td></tr>}
          </tbody>
        </table>
      </div></div></div>
    </div>
  );
}

// ── SUPPLIERS ──────────────────────────────────────────────────────────────────
function SuppliersPage({ suppliers, setSuppliers, medicines, setModal, nextId }) {
  const openForm = (s=null) => {
    let f = {name:s?.name||"",contactPerson:s?.contactPerson||"",phone:s?.phone||"",email:s?.email||"",address:s?.address||"",status:s?.status||"active"};
    const render = (f) => (
      <div>
        <div className="pms-modal-body"><div className="pms-fgrid">
          <div className="pms-fg-m col2"><label>Company Name *</label><input value={f.name} onChange={e=>{f.name=e.target.value;render(f);}}/></div>
          <div className="pms-fg-m"><label>Contact Person</label><input value={f.contactPerson} onChange={e=>{f.contactPerson=e.target.value;render(f);}}/></div>
          <div className="pms-fg-m"><label>Phone</label><input value={f.phone} onChange={e=>{f.phone=e.target.value;render(f);}}/></div>
          <div className="pms-fg-m"><label>Email</label><input value={f.email} onChange={e=>{f.email=e.target.value;render(f);}}/></div>
          <div className="pms-fg-m"><label>Address</label><input value={f.address} onChange={e=>{f.address=e.target.value;render(f);}}/></div>
          {s&&<div className="pms-fg-m"><label>Status</label><select value={f.status} onChange={e=>{f.status=e.target.value;render(f);}}><option>active</option><option>inactive</option></select></div>}
        </div></div>
        <div className="pms-modal-footer">
          <button className="btn-o" onClick={()=>setModal(null)}>Cancel</button>
          <button className="btn-p" onClick={()=>{
            if(!f.name){alert("Name required");return;}
            if(s){setSuppliers(p=>p.map(x=>x.id===s.id?{...x,...f}:x));}
            else{setSuppliers(p=>[...p,{id:Date.now(),...f}]);}
            setModal(null);
          }}>{s?"Save":"Add Supplier"}</button>
        </div>
      </div>
    );
    setModal({title:s?"Edit Supplier":"Add Supplier",body:render(f)});
  };
  return (
    <div>
      <div className="pms-ph"><div><h1>Suppliers</h1><p>{suppliers.length} supplier(s)</p></div><button className="btn-p" onClick={()=>openForm()}>{I.plus} Add Supplier</button></div>
      <div className="pms-card"><div className="pms-card-body no-pad"><div className="pms-tbl-wrap"><table>
        <thead><tr><th>Company</th><th>Contact</th><th>Phone</th><th>Email</th><th>Address</th><th>Medicines</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {suppliers.map(s=>(
            <tr key={s.id}>
              <td style={{fontWeight:700}}>{s.name}</td>
              <td>{s.contactPerson||"—"}</td><td style={{fontSize:12}}>{s.phone||"—"}</td><td style={{fontSize:12}}>{s.email||"—"}</td><td style={{fontSize:12}}>{s.address||"—"}</td>
              <td><span className="bdg bdg-blue">{medicines.filter(m=>m.supplierId===s.id).length}</span></td>
              <td><span className={`bdg ${s.status==="active"?"bdg-green":"bdg-gray"}`}>{s.status}</span></td>
              <td><div style={{display:"flex",gap:4}}>
                <button className="btn-icon" onClick={()=>openForm(s)}>✏️</button>
                <button className="btn-icon danger" onClick={()=>{if(confirm(`Delete "${s.name}"?`))setSuppliers(p=>p.filter(x=>x.id!==s.id))}}>🗑️</button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table></div></div></div>
    </div>
  );
}

// ── STOCK ──────────────────────────────────────────────────────────────────────
function StockPage({ medicines, setMedicines, stockMovements, setStockMovements, setModal, nextId }) {
  const lowStock = medicines.filter(m=>m.stock<=m.reorderLevel&&m.status==="active");
  const openAdjust = (preselect=null) => {
    let f={medicineId:preselect||medicines[0]?.id,type:"in",quantity:1,reason:""};
    const render=(f)=>(
      <div>
        <div className="pms-modal-body"><div className="pms-fgrid">
          <div className="pms-fg-m col2"><label>Medicine *</label>
            <select value={f.medicineId} onChange={e=>{f.medicineId=Number(e.target.value);render(f);}}>
              {medicines.map(m=><option key={m.id} value={m.id}>{m.name} (stock: {m.stock})</option>)}
            </select>
          </div>
          <div className="pms-fg-m"><label>Type</label>
            <select value={f.type} onChange={e=>{f.type=e.target.value;render(f);}}>
              <option value="in">Stock In (+)</option><option value="out">Stock Out (−)</option>
            </select>
          </div>
          <div className="pms-fg-m"><label>Quantity *</label><input type="number" value={f.quantity} min="1" onChange={e=>{f.quantity=Number(e.target.value);render(f);}}/></div>
          <div className="pms-fg-m col2"><label>Reason *</label><input value={f.reason} onChange={e=>{f.reason=e.target.value;render(f);}} placeholder="e.g. Received from supplier"/></div>
        </div></div>
        <div className="pms-modal-footer">
          <button className="btn-o" onClick={()=>setModal(null)}>Cancel</button>
          <button className="btn-p" onClick={()=>{
            if(!f.reason||!f.quantity){alert("Fill all fields");return;}
            const med=medicines.find(m=>m.id===f.medicineId);
            if(f.type==="out"&&med.stock<f.quantity){alert("Insufficient stock");return;}
            setMedicines(p=>p.map(m=>m.id===f.medicineId?{...m,stock:f.type==="in"?m.stock+f.quantity:m.stock-f.quantity}:m));
            setStockMovements(p=>[...p,{id:Date.now(),medicineId:f.medicineId,medicineName:med.name,type:f.type,quantity:f.quantity,reason:f.reason,createdAt:new Date().toISOString()}]);
            setModal(null);
          }}>Save Adjustment</button>
        </div>
      </div>
    );
    setModal({title:"Adjust Stock",body:render(f)});
  };
  return (
    <div>
      <div className="pms-ph"><div><h1>Stock Management</h1><p>{lowStock.length} item(s) need restocking</p></div><button className="btn-p" onClick={()=>openAdjust()}>{I.plus} Adjust Stock</button></div>
      {lowStock.length>0&&<div className="pms-alert pms-alert-w">⚠️ {lowStock.length} medicine(s) are below reorder level</div>}
      <div className="pms-card" style={{marginBottom:16}}>
        <div className="pms-card-hdr"><span className="pms-card-title">🔴 Low Stock Alert</span></div>
        <div className="pms-card-body no-pad"><div className="pms-tbl-wrap"><table>
          <thead><tr><th>Medicine</th><th>Current Stock</th><th>Reorder Level</th><th>Action</th></tr></thead>
          <tbody>
            {lowStock.map(m=>(
              <tr key={m.id}>
                <td><div style={{fontWeight:700}}>{m.name}</div><div style={{fontSize:11,color:"#94a3b8"}}>{m.genericName}</div></td>
                <td><span className="bdg bdg-orange">{m.stock} {m.unit}</span></td>
                <td style={{color:"#64748b"}}>{m.reorderLevel}</td>
                <td><button className="btn-p btn-sm" onClick={()=>openAdjust(m.id)}>{I.plus} Restock</button></td>
              </tr>
            ))}
            {lowStock.length===0&&<tr><td colSpan={4}><div className="pms-empty" style={{padding:20}}><p>✅ All medicines are well-stocked</p></div></td></tr>}
          </tbody>
        </table></div></div>
      </div>
      <div className="pms-card">
        <div className="pms-card-hdr"><span className="pms-card-title">📦 Recent Movements</span></div>
        <div className="pms-card-body no-pad"><div className="pms-tbl-wrap"><table>
          <thead><tr><th>Medicine</th><th>Type</th><th>Quantity</th><th>Reason</th><th>Date</th></tr></thead>
          <tbody>
            {[...stockMovements].reverse().slice(0,20).map(mv=>(
              <tr key={mv.id}>
                <td style={{fontWeight:600}}>{mv.medicineName}</td>
                <td><span className={`bdg ${mv.type==="in"?"bdg-green":"bdg-red"}`}>{mv.type==="in"?"↑ IN":"↓ OUT"}</span></td>
                <td style={{fontFamily:"'DM Mono',monospace"}}>{mv.quantity}</td>
                <td style={{fontSize:12,color:"#64748b"}}>{mv.reason}</td>
                <td style={{fontSize:12,color:"#94a3b8"}}>{fmtDT(mv.createdAt)}</td>
              </tr>
            ))}
            {stockMovements.length===0&&<tr><td colSpan={5}><div className="pms-empty"><p>No movements yet</p></div></td></tr>}
          </tbody>
        </table></div></div>
      </div>
    </div>
  );
}

// ── CUSTOMERS ──────────────────────────────────────────────────────────────────
function CustomersPage({ customers, setCustomers, sales, setModal }) {
  const openForm=(c=null)=>{
    let f={firstName:c?.firstName||"",lastName:c?.lastName||"",phone:c?.phone||"",email:c?.email||"",address:c?.address||""};
    const render=(f)=>(
      <div>
        <div className="pms-modal-body"><div className="pms-fgrid">
          <div className="pms-fg-m"><label>First Name *</label><input value={f.firstName} onChange={e=>{f.firstName=e.target.value;render(f);}}/></div>
          <div className="pms-fg-m"><label>Last Name *</label><input value={f.lastName} onChange={e=>{f.lastName=e.target.value;render(f);}}/></div>
          <div className="pms-fg-m"><label>Phone</label><input value={f.phone} onChange={e=>{f.phone=e.target.value;render(f);}}/></div>
          <div className="pms-fg-m"><label>Email</label><input value={f.email} onChange={e=>{f.email=e.target.value;render(f);}}/></div>
          <div className="pms-fg-m col2"><label>Address</label><input value={f.address} onChange={e=>{f.address=e.target.value;render(f);}}/></div>
        </div></div>
        <div className="pms-modal-footer">
          <button className="btn-o" onClick={()=>setModal(null)}>Cancel</button>
          <button className="btn-p" onClick={()=>{
            if(!f.firstName||!f.lastName){alert("Name required");return;}
            if(c){setCustomers(p=>p.map(x=>x.id===c.id?{...x,...f}:x));}
            else{setCustomers(p=>[...p,{id:Date.now(),...f}]);}
            setModal(null);
          }}>{c?"Save":"Add Customer"}</button>
        </div>
      </div>
    );
    setModal({title:c?"Edit Customer":"Add Customer",body:render(f)});
  };
  return (
    <div>
      <div className="pms-ph"><div><h1>Customers</h1><p>{customers.length} registered customer(s)</p></div><button className="btn-p" onClick={()=>openForm()}>{I.plus} Add Customer</button></div>
      <div className="pms-card"><div className="pms-card-body no-pad"><div className="pms-tbl-wrap"><table>
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th>Purchases</th><th>Total Spent</th><th>Actions</th></tr></thead>
        <tbody>
          {customers.map(c=>{
            const cs=sales.filter(s=>s.customerId===c.id);
            return <tr key={c.id}>
              <td style={{fontWeight:700}}>{c.firstName} {c.lastName}</td>
              <td style={{fontSize:12}}>{c.phone||"—"}</td><td style={{fontSize:12}}>{c.email||"—"}</td><td style={{fontSize:12}}>{c.address||"—"}</td>
              <td><span className="bdg bdg-blue">{cs.length}</span></td>
              <td style={{fontFamily:"'DM Mono',monospace",fontWeight:600}}>{fmt(cs.reduce((s,x)=>s+x.total,0))}</td>
              <td><div style={{display:"flex",gap:4}}>
                <button className="btn-icon" onClick={()=>openForm(c)}>✏️</button>
                <button className="btn-icon danger" onClick={()=>{if(confirm(`Delete "${c.firstName} ${c.lastName}"?`))setCustomers(p=>p.filter(x=>x.id!==c.id))}}>🗑️</button>
              </div></td>
            </tr>;
          })}
          {customers.length===0&&<tr><td colSpan={7}><div className="pms-empty"><div className="pms-empty-icon">👥</div><h3>No customers yet</h3></div></td></tr>}
        </tbody>
      </table></div></div></div>
    </div>
  );
}

// ── EMPLOYEES ──────────────────────────────────────────────────────────────────
function EmployeesPage({ employees, setEmployees, setModal }) {
  const POSITIONS=["Pharmacist","Pharmacy Aide","Cashier","Store Manager","Delivery Staff","Other"];
  const openForm=(e=null)=>{
    let f={firstName:e?.firstName||"",lastName:e?.lastName||"",position:e?.position||"Pharmacist",phone:e?.phone||"",email:e?.email||"",hiredAt:e?.hiredAt||new Date().toISOString().slice(0,10),status:e?.status||"active"};
    const render=(f)=>(
      <div>
        <div className="pms-modal-body"><div className="pms-fgrid">
          <div className="pms-fg-m"><label>First Name *</label><input value={f.firstName} onChange={ev=>{f.firstName=ev.target.value;render(f);}}/></div>
          <div className="pms-fg-m"><label>Last Name *</label><input value={f.lastName} onChange={ev=>{f.lastName=ev.target.value;render(f);}}/></div>
          <div className="pms-fg-m"><label>Position</label><select value={f.position} onChange={ev=>{f.position=ev.target.value;render(f);}}>{POSITIONS.map(p=><option key={p}>{p}</option>)}</select></div>
          <div className="pms-fg-m"><label>Hired Date</label><input type="date" value={f.hiredAt} onChange={ev=>{f.hiredAt=ev.target.value;render(f);}}/></div>
          <div className="pms-fg-m"><label>Phone</label><input value={f.phone} onChange={ev=>{f.phone=ev.target.value;render(f);}}/></div>
          <div className="pms-fg-m"><label>Email</label><input value={f.email} onChange={ev=>{f.email=ev.target.value;render(f);}}/></div>
          {e&&<div className="pms-fg-m"><label>Status</label><select value={f.status} onChange={ev=>{f.status=ev.target.value;render(f);}}><option>active</option><option>inactive</option></select></div>}
        </div></div>
        <div className="pms-modal-footer">
          <button className="btn-o" onClick={()=>setModal(null)}>Cancel</button>
          <button className="btn-p" onClick={()=>{
            if(!f.firstName||!f.lastName){alert("Name required");return;}
            if(e){setEmployees(p=>p.map(x=>x.id===e.id?{...x,...f}:x));}
            else{setEmployees(p=>[...p,{id:Date.now(),...f}]);}
            setModal(null);
          }}>{e?"Save":"Add Employee"}</button>
        </div>
      </div>
    );
    setModal({title:e?"Edit Employee":"Add Employee",body:render(f)});
  };
  return (
    <div>
      <div className="pms-ph"><div><h1>Employees</h1><p>{employees.length} employee(s)</p></div><button className="btn-p" onClick={()=>openForm()}>{I.plus} Add Employee</button></div>
      <div className="pms-card"><div className="pms-card-body no-pad"><div className="pms-tbl-wrap"><table>
        <thead><tr><th>Name</th><th>Position</th><th>Phone</th><th>Email</th><th>Hired</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {employees.map(e=>(
            <tr key={e.id}>
              <td style={{fontWeight:700}}>{e.firstName} {e.lastName}</td>
              <td><span className="bdg bdg-purple">{e.position}</span></td>
              <td style={{fontSize:12}}>{e.phone||"—"}</td><td style={{fontSize:12}}>{e.email||"—"}</td>
              <td style={{fontSize:12,color:"#64748b"}}>{fmtDate(e.hiredAt)}</td>
              <td><span className={`bdg ${e.status==="active"?"bdg-green":"bdg-gray"}`}>{e.status}</span></td>
              <td><div style={{display:"flex",gap:4}}>
                <button className="btn-icon" onClick={()=>openForm(e)}>✏️</button>
                <button className="btn-icon danger" onClick={()=>{if(confirm(`Delete "${e.firstName} ${e.lastName}"?`))setEmployees(p=>p.filter(x=>x.id!==e.id))}}>🗑️</button>
              </div></td>
            </tr>
          ))}
          {employees.length===0&&<tr><td colSpan={7}><div className="pms-empty"><div className="pms-empty-icon">👨‍⚕️</div><h3>No employees yet</h3></div></td></tr>}
        </tbody>
      </table></div></div></div>
    </div>
  );
}

// ── SALES HISTORY ──────────────────────────────────────────────────────────────
function SalesPage({ sales, customers, medicines, setModal }) {
  const total = sales.reduce((s,x)=>s+x.total,0);
  const viewSale=(s)=>{
    const cust=customers.find(c=>c.id===s.customerId);
    setModal({title:`Receipt: ${s.receiptNumber}`,body:(
      <div>
        <div className="pms-modal-body">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16,fontSize:13}}>
            <div><div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:3}}>CUSTOMER</div><div style={{fontWeight:700}}>{cust?`${cust.firstName} ${cust.lastName}`:"Walk-in"}</div></div>
            <div><div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:3}}>PAYMENT</div><div style={{fontWeight:700,textTransform:"capitalize"}}>{s.paymentMethod}</div></div>
            <div><div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:3}}>DATE</div><div>{fmtDT(s.createdAt)}</div></div>
            <div><div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:3}}>STATUS</div><span className="bdg bdg-green">{s.status}</span></div>
          </div>
          <div className="pms-tbl-wrap"><table>
            <thead><tr><th>Medicine</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
            <tbody>{(s.items||[]).map((item,i)=><tr key={i}><td>{item.medicineName}</td><td>{item.quantity}</td><td>{fmt(item.unitPrice)}</td><td style={{fontWeight:600}}>{fmt(item.subtotal)}</td></tr>)}</tbody>
          </table></div>
          <div style={{borderTop:"1px solid #e2e8f0",marginTop:12,paddingTop:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span>Subtotal</span><span>{fmt(s.subTotal)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span>Discount</span><span>−{fmt(s.discount)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:17,fontWeight:800,marginTop:8}}><span>TOTAL</span><span>{fmt(s.total)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#94a3b8",marginTop:4}}><span>Paid / Change</span><span>{fmt(s.amountPaid)} / {fmt(s.change)}</span></div>
          </div>
        </div>
        <div className="pms-modal-footer"><button className="btn-o" onClick={()=>setModal(null)}>Close</button></div>
      </div>
    )});
  };
  return (
    <div>
      <div className="pms-ph"><div><h1>Sales History</h1><p>{sales.length} transaction(s) · Total revenue: {fmt(total)}</p></div></div>
      <div className="pms-card"><div className="pms-card-body no-pad"><div className="pms-tbl-wrap"><table>
        <thead><tr><th>Receipt #</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th></th></tr></thead>
        <tbody>
          {[...sales].reverse().map(s=>{
            const cust=customers.find(c=>c.id===s.customerId);
            return <tr key={s.id}>
              <td><span className="mono">{s.receiptNumber}</span></td>
              <td>{cust?`${cust.firstName} ${cust.lastName}`:"Walk-in"}</td>
              <td style={{color:"#64748b"}}>{s.items?.length||0} item(s)</td>
              <td style={{fontFamily:"'DM Mono',monospace",fontWeight:700}}>{fmt(s.total)}</td>
              <td><span className="bdg bdg-blue">{s.paymentMethod}</span></td>
              <td><span className="bdg bdg-green">{s.status}</span></td>
              <td style={{fontSize:12,color:"#94a3b8"}}>{fmtDT(s.createdAt)}</td>
              <td><button className="btn-icon" onClick={()=>viewSale(s)}>👁️</button></td>
            </tr>;
          })}
          {sales.length===0&&<tr><td colSpan={8}><div className="pms-empty"><div className="pms-empty-icon">📋</div><h3>No sales yet</h3><p>Start selling from POS</p></div></td></tr>}
        </tbody>
      </table></div></div></div>
    </div>
  );
}

// ── USERS ──────────────────────────────────────────────────────────────────────
function UsersPage({ users, setUsers, setModal }) {
  const openCreate=()=>{
    let f={username:"",password:"",role:"staff"};
    const render=(f)=>(
      <div>
        <div className="pms-modal-body"><div className="pms-fgrid">
          <div className="pms-fg-m"><label>Username *</label><input value={f.username} onChange={e=>{f.username=e.target.value;render(f);}}/></div>
          <div className="pms-fg-m"><label>Password *</label><input type="password" value={f.password} onChange={e=>{f.password=e.target.value;render(f);}}/></div>
          <div className="pms-fg-m col2"><label>Role</label><select value={f.role} onChange={e=>{f.role=e.target.value;render(f);}}><option value="admin">Admin</option><option value="staff">Staff</option></select></div>
        </div></div>
        <div className="pms-modal-footer">
          <button className="btn-o" onClick={()=>setModal(null)}>Cancel</button>
          <button className="btn-p" onClick={()=>{
            if(!f.username||!f.password){alert("Username and password required");return;}
            if(f.password.length<6){alert("Password must be at least 6 characters");return;}
            if(users.find(u=>u.username===f.username)){alert("Username already exists");return;}
            setUsers(p=>[...p,{id:Date.now(),username:f.username,password:f.password,role:f.role,createdAt:new Date().toISOString()}]);
            setModal(null);
          }}>Create Account</button>
        </div>
      </div>
    );
    setModal({title:"Create User Account",body:render(f)});
  };
  return (
    <div>
      <div className="pms-ph"><div><h1>User Accounts</h1><p>Manage system access — only admins can create users</p></div><button className="btn-p" onClick={openCreate}>{I.plus} Create User</button></div>
      <div className="pms-card" style={{maxWidth:600}}>
        <div className="pms-card-body no-pad"><div className="pms-tbl-wrap"><table>
          <thead><tr><th>Username</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.id}>
                <td><div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div className="pms-avatar" style={{width:30,height:30,fontSize:12}}>{u.username.charAt(0).toUpperCase()}</div>
                  <span style={{fontWeight:700}}>{u.username}</span>
                </div></td>
                <td><span className={`bdg ${u.role==="admin"?"bdg-purple":"bdg-blue"}`}>{u.role}</span></td>
                <td style={{fontSize:12,color:"#94a3b8"}}>{fmtDate(u.createdAt)}</td>
                <td>{u.username==="admin"?<span className="bdg bdg-gray">Protected</span>:<button className="btn-icon danger" onClick={()=>{if(confirm(`Delete user "${u.username}"?`))setUsers(p=>p.filter(x=>x.id!==u.id))}}>🗑️</button>}</td>
              </tr>
            ))}
          </tbody>
        </table></div></div>
      </div>
      <div className="pms-card" style={{maxWidth:600,marginTop:16}}>
        <div className="pms-card-hdr"><span className="pms-card-title">⚠️ Security Note</span></div>
        <div className="pms-card-body"><p style={{fontSize:13,color:"#64748b"}}>Only administrators can create new user accounts. The default admin account is protected and cannot be deleted. Keep credentials secure and change the default password after first login.</p></div>
      </div>
    </div>
  );
}
