import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// Fixed UUIDs for predictable seeding
const TENANT_1_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const TENANT_2_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

async function main() {
    console.log('🌱 Seeding database...');

    // Check if already seeded
    const existingTenants = await prisma.tenant.count();
    if (existingTenants > 0) {
        console.log('📋 Database already seeded, skipping...');
        return;
    }

    const password = await bcrypt.hash('password123', SALT_ROUNDS);

    // ------ TENANT 1: MediCare Clinic ------
    const tenant1 = await prisma.tenant.create({
        data: {
            id: TENANT_1_ID,
            name: 'MediCare Clinic',
        },
    });

    const admin1 = await prisma.user.create({
        data: {
            tenantId: tenant1.id,
            email: 'admin@medicare.com',
            passwordHash: password,
            role: 'ADMIN',
        },
    });

    const agent1a = await prisma.user.create({
        data: {
            tenantId: tenant1.id,
            email: 'sarah@medicare.com',
            passwordHash: password,
            role: 'AGENT',
        },
    });

    const agent1b = await prisma.user.create({
        data: {
            tenantId: tenant1.id,
            email: 'mike@medicare.com',
            passwordHash: password,
            role: 'AGENT',
        },
    });

    // Leads for Tenant 1
    const lead1 = await prisma.lead.create({
        data: {
            tenantId: tenant1.id,
            phone: '+966500000001',
            name: 'Ahmed Al-Rashid',
            status: 'IN_PROGRESS',
            assignedToUserId: agent1a.id,
        },
    });

    const lead2 = await prisma.lead.create({
        data: {
            tenantId: tenant1.id,
            phone: '+966500000002',
            name: 'Fatima Hassan',
            status: 'NEW',
            assignedToUserId: agent1b.id,
        },
    });

    const lead3 = await prisma.lead.create({
        data: {
            tenantId: tenant1.id,
            phone: '+966500000003',
            name: 'Omar Khalid',
            status: 'NEW',
        },
    });

    // Messages for Lead 1
    await prisma.message.createMany({
        data: [
            {
                tenantId: tenant1.id,
                leadId: lead1.id,
                direction: 'INBOUND',
                text: 'Hello, I need to book an appointment with Dr. Smith',
                createdAt: new Date('2024-03-01T10:00:00Z'),
            },
            {
                tenantId: tenant1.id,
                leadId: lead1.id,
                direction: 'OUTBOUND',
                text: 'Hi Ahmed! Sure, Dr. Smith is available on Tuesday and Thursday this week. Which day works better for you?',
                createdAt: new Date('2024-03-01T10:05:00Z'),
            },
            {
                tenantId: tenant1.id,
                leadId: lead1.id,
                direction: 'INBOUND',
                text: 'Tuesday at 2 PM would be perfect',
                createdAt: new Date('2024-03-01T10:10:00Z'),
            },
            {
                tenantId: tenant1.id,
                leadId: lead1.id,
                direction: 'OUTBOUND',
                text: 'Great! I\'ve booked you for Tuesday at 2 PM with Dr. Smith. Please arrive 15 minutes early for paperwork.',
                createdAt: new Date('2024-03-01T10:15:00Z'),
            },
        ],
    });

    // Messages for Lead 2
    await prisma.message.createMany({
        data: [
            {
                tenantId: tenant1.id,
                leadId: lead2.id,
                direction: 'INBOUND',
                text: 'Hi, what are your consultation fees?',
                createdAt: new Date('2024-03-02T09:00:00Z'),
            },
        ],
    });

    // ------ TENANT 2: HealthFirst Hospital ------
    const tenant2 = await prisma.tenant.create({
        data: {
            id: TENANT_2_ID,
            name: 'HealthFirst Hospital',
        },
    });

    const admin2 = await prisma.user.create({
        data: {
            tenantId: tenant2.id,
            email: 'admin@healthfirst.com',
            passwordHash: password,
            role: 'ADMIN',
        },
    });

    const agent2a = await prisma.user.create({
        data: {
            tenantId: tenant2.id,
            email: 'lisa@healthfirst.com',
            passwordHash: password,
            role: 'AGENT',
        },
    });

    const agent2b = await prisma.user.create({
        data: {
            tenantId: tenant2.id,
            email: 'john@healthfirst.com',
            passwordHash: password,
            role: 'AGENT',
        },
    });

    // Leads for Tenant 2
    const lead4 = await prisma.lead.create({
        data: {
            tenantId: tenant2.id,
            phone: '+966511111001',
            name: 'Khalid Ibrahim',
            status: 'IN_PROGRESS',
            assignedToUserId: agent2a.id,
        },
    });

    const lead5 = await prisma.lead.create({
        data: {
            tenantId: tenant2.id,
            phone: '+966511111002',
            name: 'Noura Al-Dosari',
            status: 'CLOSED',
            assignedToUserId: agent2b.id,
        },
    });

    // Messages for Lead 4
    await prisma.message.createMany({
        data: [
            {
                tenantId: tenant2.id,
                leadId: lead4.id,
                direction: 'INBOUND',
                text: 'I need to reschedule my surgery appointment',
                createdAt: new Date('2024-03-03T14:00:00Z'),
            },
            {
                tenantId: tenant2.id,
                leadId: lead4.id,
                direction: 'OUTBOUND',
                text: 'Of course, Khalid. Let me check the available dates for you.',
                createdAt: new Date('2024-03-03T14:10:00Z'),
            },
        ],
    });

    // Messages for Lead 5
    await prisma.message.createMany({
        data: [
            {
                tenantId: tenant2.id,
                leadId: lead5.id,
                direction: 'INBOUND',
                text: 'Thank you for the great service!',
                createdAt: new Date('2024-03-04T16:00:00Z'),
            },
            {
                tenantId: tenant2.id,
                leadId: lead5.id,
                direction: 'OUTBOUND',
                text: 'Thank you for choosing HealthFirst! Feel free to reach out anytime.',
                createdAt: new Date('2024-03-04T16:05:00Z'),
            },
        ],
    });

    console.log('✅ Seed complete!');
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('  SEEDED CREDENTIALS');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('  Tenant 1: MediCare Clinic');
    console.log(`  Tenant ID: ${TENANT_1_ID}`);
    console.log('  ─────────────────────────────────────────────');
    console.log('  Admin: admin@medicare.com / password123');
    console.log('  Agent: sarah@medicare.com / password123');
    console.log('  Agent: mike@medicare.com  / password123');
    console.log('');
    console.log('  Tenant 2: HealthFirst Hospital');
    console.log(`  Tenant ID: ${TENANT_2_ID}`);
    console.log('  ─────────────────────────────────────────────');
    console.log('  Admin: admin@healthfirst.com / password123');
    console.log('  Agent: lisa@healthfirst.com  / password123');
    console.log('  Agent: john@healthfirst.com  / password123');
    console.log('');
    console.log('  All passwords: password123');
    console.log('═══════════════════════════════════════════════');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
