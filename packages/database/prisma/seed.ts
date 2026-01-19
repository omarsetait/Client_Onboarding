import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create test admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Delete existing users first
    await prisma.user.deleteMany({
        where: { email: { in: ['admin@tachyhealth.com', 'sales@tachyhealth.com'] } },
    });

    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@tachyhealth.com',
            passwordHash: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            isActive: true,
        },
    });

    console.log(`✅ Created admin user: ${adminUser.email}`);

    // Create sales rep user
    const salesPassword = await bcrypt.hash('sales123', 12);

    const salesUser = await prisma.user.create({
        data: {
            email: 'sales@tachyhealth.com',
            passwordHash: salesPassword,
            firstName: 'Sarah',
            lastName: 'Sales',
            role: 'SALES_REP',
            isActive: true,
        },
    });

    console.log(`✅ Created sales user: ${salesUser.email}`);

    console.log('\n🎉 Seeding complete!');
    console.log('\n📝 Login credentials:');
    console.log('   Admin: admin@tachyhealth.com / admin123');
    console.log('   Sales: sales@tachyhealth.com / sales123');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
