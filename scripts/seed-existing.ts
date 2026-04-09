/**
 * Seeds data into an EXISTING tenant — populates every table with realistic construction data.
 *
 * Usage:
 *   npx tsx scripts/seed-existing.ts
 */

import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(__dirname, '../apps/api/.env'), override: true });

const prisma = new PrismaClient();

// ── Target tenant & owner (Andy @ Tech New Constructions) ────
const TENANT_ID = '9663c390-f939-4f37-975e-1b693d29516d';
const OWNER_ID = 'e135f448-45e4-4246-817e-f438c4a9cee7';

// ── Helpers ──────────────────────────────────────────────────
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysFromNow(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] { return [...arr].sort(() => 0.5 - Math.random()).slice(0, n); }

async function seed() {
  console.log('🌱 Seeding data into existing tenant...\n');

  const tenantId = TENANT_ID;
  const ownerId = OWNER_ID;
  const ts = Date.now();

  // ── 1. Create team members ──────────────────────────────────
  console.log('1/12 Creating team members...');
  const memberDefs = [
    { name: 'Ama Mensah', role: 'PROJECT_MANAGER' as const, email: `ama.mensah+${ts}@techcons.io`, phone: `+23324100${ts.toString().slice(-4)}` },
    { name: 'Kofi Boateng', role: 'FOREMAN' as const, phone: `+23324200${ts.toString().slice(-4)}` },
    { name: 'Yaa Osei', role: 'ARCHITECT' as const, email: `yaa.osei+${ts}@techcons.io`, phone: `+23324300${ts.toString().slice(-4)}` },
    { name: 'Emmanuel Tetteh', role: 'FIELD_WORKER' as const, phone: `+23324400${ts.toString().slice(-4)}` },
    { name: 'Abena Darko', role: 'FIELD_WORKER' as const, phone: `+23324500${ts.toString().slice(-4)}` },
    { name: 'Samuel Adjei', role: 'FOREMAN' as const, phone: `+23324600${ts.toString().slice(-4)}` },
    { name: 'Priscilla Owusu', role: 'FIELD_WORKER' as const, phone: `+23324700${ts.toString().slice(-4)}` },
    { name: 'Daniel Ankrah', role: 'ARCHITECT' as const, email: `daniel.ankrah+${ts}@techcons.io`, phone: `+23324800${ts.toString().slice(-4)}` },
  ];

  const users: { id: string; name: string; role: string }[] = [
    { id: ownerId, name: 'Andy', role: 'OWNER' },
  ];

  for (const m of memberDefs) {
    const u = await prisma.user.create({
      data: {
        tenantId,
        name: m.name,
        role: m.role,
        email: m.email ?? null,
        whatsappPhone: m.phone,
        isActive: true,
        lastActiveAt: daysAgo(randomInt(0, 7)),
      },
    });
    users.push({ id: u.id, name: m.name, role: m.role });
    console.log(`   ✓ ${m.name} (${m.role})`);
  }
  console.log();

  const pmUsers = users.filter(u => u.role === 'PROJECT_MANAGER' || u.role === 'OWNER');
  const architectUsers = users.filter(u => u.role === 'ARCHITECT');
  const foremanUsers = users.filter(u => u.role === 'FOREMAN');
  const fieldWorkers = users.filter(u => u.role === 'FIELD_WORKER');
  const nonOwnerUsers = users.filter(u => u.id !== ownerId);

  // ── 2. Create projects ─────────────────────────────────────
  console.log('2/12 Creating projects...');
  const projectDefs = [
    {
      name: 'Accra Heights Residential',
      clientName: 'GoldKey Properties',
      description: 'A 24-unit luxury residential development in East Legon with swimming pool, gym, and rooftop gardens.',
      budgetGhs: 4500000, budgetUsd: 350000, fxRateGhsUsd: 12.85,
      startDate: daysAgo(120), expectedEndDate: daysFromNow(200),
      status: 'ACTIVE' as const,
    },
    {
      name: 'Kumasi Central Market',
      clientName: 'KMA Development Authority',
      description: 'Renovation and expansion of Kumasi Central Market. Phase 1 covers the main trading hall and parking structure.',
      budgetGhs: 2800000, budgetUsd: 220000, fxRateGhsUsd: 12.73,
      startDate: daysAgo(60), expectedEndDate: daysFromNow(300),
      status: 'ACTIVE' as const,
    },
    {
      name: 'Tema Port Warehouse',
      clientName: 'Atlantic Logistics Group',
      description: 'Steel-framed 5,000 sqm warehouse at Tema Port free zone with loading bays and cold storage wing.',
      budgetGhs: 3200000, budgetUsd: 250000, fxRateGhsUsd: 12.80,
      startDate: daysAgo(200), expectedEndDate: daysFromNow(30),
      status: 'ACTIVE' as const,
    },
    {
      name: 'Takoradi Office Complex',
      clientName: 'Western Energy Partners',
      description: 'Three-story office complex with conference center and underground parking. LEED-certified design.',
      budgetGhs: 6000000, budgetUsd: 470000, fxRateGhsUsd: 12.77,
      startDate: daysAgo(30), expectedEndDate: daysFromNow(400),
      status: 'ACTIVE' as const,
    },
    {
      name: 'Cape Coast Heritage Hotel',
      clientName: 'Heritage Hospitality Group',
      description: 'Boutique 40-room hotel near Cape Coast Castle. Restoration of colonial-era facade with modern interiors.',
      budgetGhs: 1800000, budgetUsd: 140000, fxRateGhsUsd: 12.86,
      startDate: daysAgo(300), expectedEndDate: daysAgo(10),
      actualEndDate: daysAgo(5),
      status: 'COMPLETED' as const,
    },
    {
      name: 'Ho Municipal Library',
      clientName: 'Volta Regional Administration',
      description: 'Public library and community learning center with reading rooms, computer lab, and auditorium.',
      budgetGhs: 950000,
      startDate: daysFromNow(15), expectedEndDate: daysFromNow(365),
      status: 'ON_HOLD' as const,
    },
  ];

  const projects: { id: string; code: string; name: string; status: string }[] = [];
  // include existing project
  const existingProject = await prisma.project.findFirst({ where: { tenantId, code: 'TEC-01' } });
  if (existingProject) {
    projects.push({ id: existingProject.id, code: existingProject.code, name: existingProject.name, status: existingProject.status });
  }

  let codeIdx = projects.length + 1;
  for (const def of projectDefs) {
    const code = `TEC-${String(codeIdx++).padStart(2, '0')}`;
    const p = await prisma.project.create({
      data: {
        tenantId,
        code,
        name: def.name,
        clientName: def.clientName,
        description: def.description,
        status: def.status,
        budgetGhs: def.budgetGhs,
        budgetUsd: def.budgetUsd ?? null,
        fxRateGhsUsd: def.fxRateGhsUsd ?? null,
        startDate: def.startDate,
        expectedEndDate: def.expectedEndDate,
        actualEndDate: (def as any).actualEndDate ?? null,
      },
    });
    projects.push({ id: p.id, code, name: def.name, status: def.status });
    console.log(`   ✓ ${code} — ${def.name} [${def.status}]`);
  }
  console.log();

  const activeProjects = projects.filter(p => p.status === 'ACTIVE');

  // ── 3. Add project members ─────────────────────────────────
  console.log('3/12 Adding project members...');
  for (const project of activeProjects) {
    const memberPool = [
      ...pickN(pmUsers, 1),
      ...pickN(architectUsers, 1),
      ...pickN(foremanUsers, 1),
      ...pickN(fieldWorkers, randomInt(2, 3)),
    ];
    const memberSet = [
      { id: ownerId, role: 'OWNER' as const },
      ...memberPool.filter(u => u.id !== ownerId).map(u => ({ id: u.id, role: u.role as any })),
    ];
    for (const m of memberSet) {
      try {
        await prisma.projectMember.create({
          data: { projectId: project.id, userId: m.id, role: m.role },
        });
      } catch { /* duplicate */ }
    }
    console.log(`   ✓ ${memberSet.length} members → ${project.code}`);
  }
  console.log();

  // ── 4. Create phases ───────────────────────────────────────
  console.log('4/12 Creating project phases...');
  const phaseTemplates = [
    { name: 'Site Preparation', order: 0, pct: 100, status: 'COMPLETED' as const },
    { name: 'Foundation & Substructure', order: 1, pct: 100, status: 'COMPLETED' as const },
    { name: 'Superstructure', order: 2, pct: 65, status: 'IN_PROGRESS' as const },
    { name: 'Roofing', order: 3, pct: 15, status: 'IN_PROGRESS' as const },
    { name: 'MEP Rough-in', order: 4, pct: 0, status: 'NOT_STARTED' as const },
    { name: 'Plastering & Finishes', order: 5, pct: 0, status: 'NOT_STARTED' as const },
    { name: 'External Works', order: 6, pct: 0, status: 'NOT_STARTED' as const },
    { name: 'Handover & Defects', order: 7, pct: 0, status: 'NOT_STARTED' as const },
  ];

  for (const project of activeProjects) {
    const off = activeProjects.indexOf(project) * 10;
    for (const pt of phaseTemplates) {
      await prisma.projectPhase.create({
        data: {
          projectId: project.id, name: pt.name, order: pt.order,
          percentComplete: pt.pct, status: pt.status,
          plannedStart: daysAgo(120 - pt.order * 25 + off),
          plannedEnd: daysAgo(95 - pt.order * 25 + off),
          ...(pt.status === 'COMPLETED' ? { actualStart: daysAgo(122 - pt.order * 25 + off), actualEnd: daysAgo(97 - pt.order * 25 + off) } : {}),
          ...(pt.status === 'IN_PROGRESS' ? { actualStart: daysAgo(100 - pt.order * 25 + off) } : {}),
        },
      });
    }
    console.log(`   ✓ 8 phases → ${project.code}`);
  }
  console.log();

  // ── 5. Cost entries ────────────────────────────────────────
  console.log('5/12 Creating cost entries...');
  const costCategories = ['MATERIALS', 'LABOUR', 'EQUIPMENT', 'SUBCONTRACTORS', 'TRANSPORT', 'MISCELLANEOUS'] as const;
  const costDescs: Record<string, string[]> = {
    MATERIALS: ['Cement (50 bags)', 'Reinforcement steel 16mm', 'Sand & gravel delivery', 'Roofing sheets', 'Electrical cable 100m', 'PVC pipes & fittings', 'Paint (exterior)', 'Ceramic floor tiles', 'Granite cladding panels', 'Timber formwork'],
    LABOUR: ['Masonry gang week 12', 'Steel fixers overtime', 'Carpentry crew', 'Painting subcontract', 'Plumber daily rate x5', 'Tiler crew — 3 days', 'Welders — gate fabrication'],
    EQUIPMENT: ['Crane hire 2 days', 'Concrete pump rental', 'Excavator mobilization', 'Generator fuel weekly', 'Scaffolding rental'],
    SUBCONTRACTORS: ['Electrical rough-in milestone', 'Plumbing first fix', 'Tiling contractor advance', 'HVAC duct installation', 'Elevator shaft prep'],
    TRANSPORT: ['Material delivery Accra-site', 'Equipment transport', 'Staff shuttle monthly', 'Waste removal 2 trips'],
    MISCELLANEOUS: ['Site security monthly', 'Water supply charges', 'Permit renewal fee', 'Site office supplies', 'PPE restocking'],
  };
  const costStatuses = ['PENDING_CONFIRMATION', 'CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'REJECTED'] as const;

  for (const project of activeProjects) {
    const n = randomInt(12, 22);
    for (let i = 0; i < n; i++) {
      const cat = pick([...costCategories]);
      const currency = Math.random() > 0.8 ? 'USD' as const : 'GHS' as const;
      const status = pick([...costStatuses]);
      const confirmer = status === 'CONFIRMED' ? pick(pmUsers) : null;
      await prisma.costEntry.create({
        data: {
          projectId: project.id, tenantId,
          description: pick(costDescs[cat] ?? ['General expense']),
          category: cat, currency, amount: randomInt(500, 85000),
          source: Math.random() > 0.6 ? 'WHATSAPP_AI' : 'MANUAL',
          status,
          loggedById: pick(users).id,
          confirmedById: confirmer?.id ?? null,
          confirmedAt: confirmer ? daysAgo(randomInt(0, 5)) : null,
          ...(status === 'REJECTED' ? { rejectionReason: 'Amount exceeds budget line' } : {}),
          fxRateAtEntry: currency === 'USD' ? 12.80 : null,
          entryDate: daysAgo(randomInt(1, 90)),
        },
      });
    }
    console.log(`   ✓ ${n} costs → ${project.code}`);
  }
  console.log();

  // ── 6. Daily logs (diary) ──────────────────────────────────
  console.log('6/12 Creating diary entries...');
  const diaryActivities = [
    'Block work continued on 2nd floor east wing', 'Column casting completed for grid C-D',
    'Plumbing rough-in for ground floor bathrooms', 'Electrical conduit installation in ceiling void',
    'Roof truss installation — 60% complete', 'Plastering external walls — north facade',
    'Floor tiling in common areas', 'Window frame installation — aluminum',
    'Steel reinforcement for beam B4-B7', 'Concrete curing — 1st floor slab',
    'Formwork stripping and cleanup', 'Waterproofing membrane applied to basement',
    'Site clearing for external works', 'Boundary wall construction started',
  ];
  const diaryRaw = [
    'Good progress today. Block work on 2nd floor east wing. 12 workers on site. Weather was clear. Used 30 bags cement.',
    'Poured concrete for columns C4-C8. Pump arrived late but we managed. No incidents. 15 workers present.',
    'Plumbing team ran all pipes for ground floor bathrooms. Waiting on inspector approval before closing walls.',
    'Electrical team focused on ceiling void conduit. Ran out of 20mm conduit — need to reorder.',
    'Roof truss installation going well. Crane on site all day. About 60% done. Should finish by Wednesday.',
    'Plastering external walls north side. Hot weather helped drying. Scaffolding moved to next section after lunch.',
    'Floor tiling in progress in lobby and corridors. Some tiles had slight color variation — supplier notified.',
    'Aluminum window frames delivered and installation started on ground floor. 20 of 48 windows fitted.',
    'Steel fixers completed reinforcement for beam B4 through B7. Ready for casting tomorrow morning.',
    'Curing ongoing for 1st floor slab. Watered twice today. No foot traffic allowed for 3 more days.',
    'Stripped formwork from columns. Some minor honeycombing on C6 — will patch and monitor.',
    'Applied waterproofing membrane in basement. Two coats done. Third coat tomorrow.',
    'Rainy morning delayed start by 2 hours. Afternoon was productive — completed slab reinforcement for section 3.',
    'Client visited site. Pleased with progress. Asked about timeline for finishing. PM to update schedule.',
    'Safety briefing conducted. New PPE distributed. One near-miss reported — scaffolding board loose. Fixed immediately.',
    'Material delivery: 200 bags cement, 50 lengths rebar 16mm. Stored in covered area.',
  ];
  const weatherOptions = ['Clear and sunny', 'Partly cloudy', 'Overcast', 'Light rain in morning', 'Heavy rain — delayed start', 'Hot and humid', 'Harmattan haze'];
  const aiSummaries = [
    'Block work progressed on 2nd floor east wing with 12 workers. 30 bags cement consumed. Clear weather. No incidents.',
    'Concrete pour completed for columns C4-C8 despite late pump arrival. 15 workers on site. No safety issues.',
    'Plumbing rough-in finished for ground floor. Awaiting inspector approval. Good productivity day.',
    'Electrical conduit work in ceiling void. Material shortage on 20mm conduit — procurement notified.',
    'Roof truss installation reached 60%. Crane utilized full day. Estimated completion by midweek.',
    'External plastering on north facade progressed well. Favorable drying conditions. Scaffolding repositioned.',
    'Floor tiling ongoing in lobby and corridors. Minor tile color variation flagged to supplier.',
    'Window installation started — 20 of 48 aluminum frames installed on ground floor.',
    'Steel reinforcement completed for beams B4-B7. Ready for casting. No rework needed.',
    'Slab curing day 4 — watered twice. Restricted access maintained. Structural integrity on schedule.',
  ];
  const photoUrls = [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600',
    'https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?w=600',
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600',
    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600',
    'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600',
    'https://images.unsplash.com/photo-1587582423116-ec07293f0395?w=600',
    'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=600',
  ];

  for (const project of activeProjects) {
    const n = randomInt(15, 25);
    for (let i = 0; i < n; i++) {
      const logDate = daysAgo(i);
      const submitter = pick([...foremanUsers, ...fieldWorkers, ...pmUsers]);
      const log = await prisma.dailyLog.create({
        data: {
          projectId: project.id, tenantId, logDate,
          submittedById: submitter.id,
          rawContent: pick(diaryRaw),
          aiSummary: pick(aiSummaries),
          activities: pickN(diaryActivities, randomInt(2, 5)),
          materials: { items: [{ name: 'Cement', qty: randomInt(10, 50), unit: 'bags' }, { name: 'Rebar 16mm', qty: randomInt(5, 30), unit: 'pcs' }] },
          incidents: Math.random() > 0.85 ? ['Minor scaffolding issue — resolved on site'] : [],
          weather: pick(weatherOptions),
          source: Math.random() > 0.5 ? 'TEXT' : 'IMAGE',
        },
      });
      const numPhotos = randomInt(0, 3);
      for (let j = 0; j < numPhotos; j++) {
        await prisma.dailyLogPhoto.create({
          data: {
            dailyLogId: log.id,
            storageUrl: pick(photoUrls),
            caption: pick(['Site progress', 'Concrete pour', 'Steel work', 'Formwork', 'Delivery', null]),
            takenAt: logDate,
          },
        });
      }
    }
    console.log(`   ✓ ${n} diary entries → ${project.code}`);
  }
  console.log();

  // ── 7. Attendance logs ─────────────────────────────────────
  console.log('7/12 Creating attendance logs...');
  for (const project of activeProjects) {
    let count = 0;
    for (let day = 0; day < 30; day++) {
      if (Math.random() < 0.15) continue;
      const logDate = daysAgo(day);
      await prisma.attendanceLog.create({
        data: {
          projectId: project.id, tenantId, logDate,
          workerCount: randomInt(8, 28),
          reportedById: pick([...foremanUsers, ...pmUsers]).id,
          confirmedAt: Math.random() > 0.3 ? logDate : null,
        },
      });
      count++;
    }
    console.log(`   ✓ ${count} attendance → ${project.code}`);
  }
  console.log();

  // ── 8. RFIs ────────────────────────────────────────────────
  console.log('8/12 Creating RFIs...');
  const rfiTitles = [
    'Column C4 reinforcement detail clarification', 'Window dimensions on elevation sheet A-201',
    'Slab penetration locations for MEP', 'Fire escape route width confirmation',
    'Foundation depth at grid line F', 'Waterproofing spec for basement walls',
    'Ceiling height in reception area', 'Staircase handrail material specification',
    'Car park level floor finish', 'Roof drainage layout confirmation',
    'External cladding color approval', 'Electrical panel room ventilation',
    'Lift shaft dimensions confirmation', 'Kitchen exhaust duct routing',
    'Retaining wall design for sloped section', 'Glass balustrade loading specification',
    'Acoustic insulation for conference rooms', 'Generator room exhaust clearance',
  ];

  for (const project of activeProjects) {
    const n = randomInt(5, 9);
    let refNo = 1;
    for (let i = 0; i < n; i++) {
      const title = pick(rfiTitles);
      const dueOffset = randomInt(-10, 21);
      const isOverdue = dueOffset < 0;
      const statuses = isOverdue && Math.random() > 0.3
        ? ['OPEN'] as const
        : (['OPEN', 'ACKNOWLEDGED', 'ANSWERED', 'CLOSED'] as const);
      const status = pick([...statuses]);
      const raiser = pick([...pmUsers, ...architectUsers, ...foremanUsers]);
      const assignee = pick([...architectUsers, ...pmUsers]);
      await prisma.rFI.create({
        data: {
          projectId: project.id, tenantId,
          referenceNo: `RFI-${project.code}-${String(refNo++).padStart(3, '0')}`,
          title, description: `Clarification required on ${title.toLowerCase()}. Please review drawings and provide guidance.`,
          status, raisedById: raiser.id, assignedToId: assignee.id,
          dueDate: dueOffset >= 0 ? daysFromNow(dueOffset) : daysAgo(Math.abs(dueOffset)),
          ...(status === 'ANSWERED' || status === 'CLOSED' ? { response: 'Reviewed and confirmed per discussion with lead consultant. Proceed as indicated on revised drawing Rev C.', respondedAt: daysAgo(randomInt(0, 5)) } : {}),
          ...(status === 'CLOSED' ? { closedAt: daysAgo(randomInt(0, 3)) } : {}),
        },
      });
    }
    console.log(`   ✓ ${n} RFIs → ${project.code}`);
  }
  console.log();

  // ── 9. Delay logs ──────────────────────────────────────────
  console.log('9/12 Creating delay logs...');
  const delayCauses = ['WEATHER', 'MATERIALS', 'LABOUR', 'DESIGN', 'CLIENT', 'UTILITIES', 'OTHER'] as const;
  const delayDescs: Record<string, string[]> = {
    WEATHER: ['Heavy rainfall halted concrete pour', 'Thunderstorm — unsafe crane operation', 'Flooding on access road', 'Strong winds — suspended height work'],
    MATERIALS: ['Cement delivery delayed by supplier', 'Steel reinforcement stock out', 'Tiles shipment held at port', 'Wrong paint color delivered'],
    LABOUR: ['Mason gang no-show', 'Electricians on competing project', 'Public holiday — reduced crew', 'Key welder sick leave'],
    DESIGN: ['Revised structural drawing pending', 'Architect reviewing facade change', 'MEP clash resolution pending', 'Waiting on structural engineer'],
    CLIENT: ['Client requested design change meeting', 'Awaiting client approval on finishes', 'Payment milestone not released', 'Client visit delayed decision'],
    UTILITIES: ['ECG power outage', 'Water supply cut to site', 'Telecom cable rerouting'],
    OTHER: ['Local community engagement session', 'Government inspection delay', 'Equipment breakdown — crane hydraulics'],
  };

  for (const project of activeProjects) {
    const n = randomInt(5, 10);
    for (let i = 0; i < n; i++) {
      const cause = pick([...delayCauses]);
      await prisma.delayLog.create({
        data: {
          projectId: project.id, tenantId,
          delayDate: daysAgo(randomInt(1, 60)),
          durationHours: randomInt(2, 16),
          cause, description: pick(delayDescs[cause] ?? ['Unexpected delay']),
          reportedById: pick([...foremanUsers, ...pmUsers]).id,
          reviewedByPM: Math.random() > 0.4,
        },
      });
    }
    console.log(`   ✓ ${n} delays → ${project.code}`);
  }
  console.log();

  // ── 10. Materials requests ─────────────────────────────────
  console.log('10/12 Creating materials requests...');
  const materialItems = [
    { desc: 'Portland Cement 42.5R', qty: 200, unit: 'bags', cost: 75 },
    { desc: 'Iron rods 16mm', qty: 500, unit: 'pcs', cost: 120 },
    { desc: 'Sand (fine)', qty: 30, unit: 'trips', cost: 850 },
    { desc: 'Gravel 20mm', qty: 25, unit: 'trips', cost: 950 },
    { desc: 'Roofing sheets (0.55mm)', qty: 150, unit: 'sheets', cost: 85 },
    { desc: 'Plywood 18mm', qty: 80, unit: 'sheets', cost: 165 },
    { desc: 'Nails 4 inch', qty: 50, unit: 'kg', cost: 15 },
    { desc: 'PVC conduit 20mm', qty: 200, unit: 'lengths', cost: 12 },
    { desc: 'Binding wire', qty: 30, unit: 'kg', cost: 18 },
    { desc: 'Ceramic tiles 60x60', qty: 300, unit: 'boxes', cost: 45 },
  ];
  const matStatuses = ['DRAFT', 'SUBMITTED', 'AWAITING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_DELIVERED', 'DELIVERED'] as const;

  for (const project of activeProjects) {
    const n = randomInt(3, 6);
    for (let i = 0; i < n; i++) {
      const itemCount = randomInt(2, 5);
      const items = pickN(materialItems, itemCount);
      const status = pick([...matStatuses]);
      const requester = pick([...foremanUsers, ...pmUsers]);
      const approver = ['APPROVED','ORDERED','DELIVERED','PARTIALLY_DELIVERED'].includes(status) ? pick(pmUsers) : null;
      const total = items.reduce((s, it) => s + randomInt(10, it.qty) * it.cost, 0);

      const req = await prisma.materialsRequest.create({
        data: {
          projectId: project.id, tenantId,
          requestedById: requester.id, status, estimatedTotal: total,
          currency: 'GHS', notes: `Materials for ${pick(['foundation', 'superstructure', 'roofing', 'finishing', 'MEP'])} phase`,
          requiresOwnerApproval: total > 50000,
          approvedById: approver?.id ?? null,
          approvedAt: approver ? daysAgo(randomInt(0, 10)) : null,
        },
      });
      for (const it of items) {
        const qty = randomInt(10, it.qty);
        const delivered = status === 'DELIVERED' ? qty : status === 'PARTIALLY_DELIVERED' ? randomInt(1, qty - 1) : null;
        await prisma.materialsRequestItem.create({
          data: {
            materialsRequestId: req.id, description: it.desc,
            quantity: qty, unit: it.unit, estimatedUnitCost: it.cost,
            deliveredQuantity: delivered, deliveredAt: delivered ? daysAgo(randomInt(0, 5)) : null,
          },
        });
      }
    }
    console.log(`   ✓ ${n} materials requests → ${project.code}`);
  }
  console.log();

  // ── 11. Drawing reviews ────────────────────────────────────
  console.log('11/12 Creating drawing reviews...');
  const drawingTitles = [
    'Architectural Floor Plans — Ground Floor', 'Architectural Floor Plans — First Floor',
    'Structural Layout — Foundation', 'Structural Layout — Columns & Beams',
    'MEP Coordination Drawing', 'External Elevation — North', 'External Elevation — South',
    'Roof Framing Plan', 'Landscape & Parking Layout', 'Interior Finishes Schedule',
    'Plumbing Riser Diagram', 'Fire Detection Layout',
  ];
  const drawingStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'RESUBMITTED', 'APPROVED'] as const;

  for (const project of activeProjects) {
    const n = randomInt(4, 7);
    const titles = pickN(drawingTitles, n);
    for (const title of titles) {
      const status = pick([...drawingStatuses]);
      const submitter = pick([...architectUsers, ...pmUsers]);
      const reviewer = pick(pmUsers);
      const review = await prisma.drawingReview.create({
        data: {
          projectId: project.id, tenantId,
          title, description: `${title} — submitted for consultant review.`,
          status, submittedById: submitter.id, reviewerId: reviewer.id,
        },
      });
      const numRevs = randomInt(1, 3);
      for (let r = 0; r < numRevs; r++) {
        await prisma.drawingRevision.create({
          data: {
            drawingReviewId: review.id,
            revisionNumber: `Rev ${String.fromCharCode(65 + r)}`,
            storageUrl: `https://storage.example.com/drawings/${review.id}/rev-${r}.pdf`,
            fileSize: randomInt(500000, 15000000),
            mimeType: 'application/pdf',
            uploadedById: submitter.id,
            comments: r > 0 ? 'Updated per review comments' : 'Initial submission',
            reviewedAt: r < numRevs - 1 ? daysAgo(randomInt(1, 20)) : null,
            reviewedById: r < numRevs - 1 ? reviewer.id : null,
          },
        });
      }
    }
    console.log(`   ✓ ${n} drawings → ${project.code}`);
  }
  console.log();

  // ── 12. Project files + Progress reports ───────────────────
  console.log('12/12 Creating files & reports...');
  const fileTemplates = [
    { name: 'Contract Agreement.pdf', folder: 'CONTRACTS' as const, mime: 'application/pdf', size: 2500000 },
    { name: 'Building Permit.pdf', folder: 'PERMITS' as const, mime: 'application/pdf', size: 1200000 },
    { name: 'Environmental Assessment.pdf', folder: 'PERMITS' as const, mime: 'application/pdf', size: 3400000 },
    { name: 'Architectural Drawings Rev B.pdf', folder: 'DRAWINGS' as const, mime: 'application/pdf', size: 8500000 },
    { name: 'Structural Calculations.pdf', folder: 'DRAWINGS' as const, mime: 'application/pdf', size: 4200000 },
    { name: 'MEP Layout.dwg', folder: 'DRAWINGS' as const, mime: 'application/octet-stream', size: 12000000 },
    { name: 'Monthly Report March 2026.pdf', folder: 'REPORTS' as const, mime: 'application/pdf', size: 1800000 },
    { name: 'Monthly Report February 2026.pdf', folder: 'REPORTS' as const, mime: 'application/pdf', size: 1600000 },
    { name: 'Bill of Quantities.xlsx', folder: 'OTHER' as const, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 450000 },
    { name: 'Site Photos Compilation.zip', folder: 'OTHER' as const, mime: 'application/zip', size: 25000000 },
    { name: 'Insurance Certificate.pdf', folder: 'CONTRACTS' as const, mime: 'application/pdf', size: 980000 },
    { name: 'Soil Investigation Report.pdf', folder: 'REPORTS' as const, mime: 'application/pdf', size: 5600000 },
  ];

  for (const project of activeProjects) {
    const files = pickN(fileTemplates, randomInt(5, 9));
    for (const f of files) {
      await prisma.projectFile.create({
        data: {
          projectId: project.id, tenantId,
          name: f.name, folder: f.folder,
          storageUrl: `https://storage.example.com/${project.id}/${f.name.replace(/ /g, '_')}`,
          fileSize: f.size + randomInt(-100000, 100000),
          mimeType: f.mime, uploadedById: pick(users).id,
        },
      });
    }
    console.log(`   ✓ ${files.length} files → ${project.code}`);

    const numReports = randomInt(2, 4);
    for (let i = 0; i < numReports; i++) {
      const periodEnd = daysAgo(i * 30);
      const periodStart = daysAgo(i * 30 + 30);
      await prisma.progressReport.create({
        data: {
          projectId: project.id, tenantId,
          periodStart, periodEnd,
          generatedById: pick(pmUsers).id,
          narrativeSummary: `Project ${project.name}: During this period, significant progress was made on superstructure and MEP. ${randomInt(12, 25)} workers averaged daily. Budget utilization at ${randomInt(30, 75)}%. Key milestones: ${pick(['column casting', 'beam pouring', 'roof truss installation', 'floor slab'])} completed. Weather caused ${randomInt(1, 4)} day(s) delay. Project is ${pick(['on track', 'slightly behind schedule', 'ahead of schedule'])}.`,
          storageUrl: `https://storage.example.com/${project.id}/reports/report-${i + 1}.pdf`,
          sentToEmail: Math.random() > 0.5 ? `client@${project.code.toLowerCase()}.example.com` : null,
          sentAt: Math.random() > 0.5 ? periodEnd : null,
        },
      });
    }
    console.log(`   ✓ ${numReports} reports → ${project.code}`);
  }

  // Branding
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { primaryColor: '#1e293b', logoUrl: 'https://ui-avatars.com/api/?name=TN&background=1e293b&color=fff&size=128' },
  });

  const totalCounts = {
    projects: projects.length,
    active: activeProjects.length,
    users: users.length,
    phases: activeProjects.length * 8,
  };

  console.log('\n════════════════════════════════════════════');
  console.log('  ✅  Seed complete!');
  console.log('════════════════════════════════════════════\n');
  console.log(`  Tenant: Tech New Constructions`);
  console.log(`  ${totalCounts.projects} projects (${totalCounts.active} active + existing)`);
  console.log(`  ${totalCounts.users} team members`);
  console.log(`  Data across: costs, diary, attendance, RFIs, delays,`);
  console.log(`               materials, drawings, files, reports`);
  console.log('\n  Refresh the browser to see the data! 🎉');
  console.log('════════════════════════════════════════════\n');
}

seed()
  .catch(err => { console.error('❌ Seed failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
