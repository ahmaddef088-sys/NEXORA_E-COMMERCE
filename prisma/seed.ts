import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, Role, CouponType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import crypto from 'crypto';

/**
 * Helper to generate secure salt and hash for demo users
 */
function hashPassword(password: string, salt?: string) {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nexora?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Nexora Commerce demo catalog...');

  // 1. Seed Users (Admin & Demo Customer)
  const adminPass = hashPassword('AdminPass123!');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nexora.com' },
    update: {},
    create: {
      email: 'admin@nexora.com',
      name: 'Nexora Administrator',
      passwordHash: adminPass.hash,
      salt: adminPass.salt,
      role: Role.ADMIN,
    },
  });

  const customerPass = hashPassword('CustomerPass123!');
  const demoUser = await prisma.user.upsert({
    where: { email: 'customer@nexora.com' },
    update: {},
    create: {
      email: 'customer@nexora.com',
      name: 'Sarah Jenkins',
      passwordHash: customerPass.hash,
      salt: customerPass.salt,
      role: Role.CUSTOMER,
    },
  });

  console.log(`✓ Seeded users: Admin (${adminUser.email}), Customer (${demoUser.email})`);

  // 2. Seed Categories
  const categoriesData = [
    {
      slug: 'smartphones',
      name: 'Smartphones',
      description: 'Flagship & budget mobile devices with fast delivery',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    },
    {
      slug: 'laptops-computers',
      name: 'Laptops & Computers',
      description: 'High performance workstations, laptops, and ultraportable notebooks',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
    },
    {
      slug: 'gaming',
      name: 'Gaming Gear',
      description: 'Precision gaming peripherals, mechanical keyboards, and displays',
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
    },
    {
      slug: 'audio',
      name: 'Audio & Acoustics',
      description: 'Wireless noise-canceling headphones, true wireless earbuds, and speakers',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    },
    {
      slug: 'accessories',
      name: 'Accessories',
      description: 'USB-C hubs, high-capacity power banks, cables, and ergonomic tools',
      image: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=600&auto=format&fit=crop&q=80',
    },
    {
      slug: 'home-office',
      name: 'Home & Office',
      description: 'Ergonomic chairs, smart lighting, 4K webcams, and desk setups',
      image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&auto=format&fit=crop&q=80',
    },
    {
      slug: 'wearables',
      name: 'Smartwatches & Wearables',
      description: 'Fitness trackers, heart-rate monitors, and active smartwatches',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    },
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, image: cat.image },
      create: {
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        image: cat.image,
        isActive: true,
      },
    });
    categoryMap.set(cat.slug, created.id);
  }

  console.log(`✓ Seeded ${categoryMap.size} categories`);

  // 3. Seed Products (30 Realistic Products)
  const productsData = [
    // Smartphones
    {
      name: 'Nexora Horizon 15 Pro',
      slug: 'nexora-horizon-15-pro',
      sku: 'NEX-PHN-001',
      description: 'Flagship 6.7-inch OLED smartphone with 120Hz display, triple camera system, and 5000mAh all-day battery.',
      price: 999.0,
      compareAtPrice: 1099.0,
      stock: 25,
      categorySlug: 'smartphones',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Nexora Horizon 15 Lite',
      slug: 'nexora-horizon-15-lite',
      sku: 'NEX-PHN-002',
      description: 'Sleek 6.4-inch smartphone featuring dual camera lens, fast 67W charging, and 256GB storage.',
      price: 499.0,
      compareAtPrice: null,
      stock: 40,
      categorySlug: 'smartphones',
      image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Apex Fold 5G Smartphone',
      slug: 'apex-fold-5g-smartphone',
      sku: 'NEX-PHN-003',
      description: 'Next-gen foldable smartphone with dual AMOLED displays, aluminum hinge, and pro multitasking controls.',
      price: 1399.0,
      compareAtPrice: 1599.0,
      stock: 12,
      categorySlug: 'smartphones',
      image: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Nova Compact 5G Phone',
      slug: 'nova-compact-5g-phone',
      sku: 'NEX-PHN-004',
      description: 'Ergonomic 5.8-inch compact smartphone with IP68 water resistance and long battery performance.',
      price: 399.0,
      compareAtPrice: null,
      stock: 0, // Out of stock demo
      categorySlug: 'smartphones',
      image: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&auto=format&fit=crop&q=80',
    },

    // Laptops & Computers
    {
      name: 'ProBook Studio 14-inch Laptop',
      slug: 'probook-studio-14-laptop',
      sku: 'NEX-LAP-001',
      description: 'Aluminum chassis 14-inch laptop powered by 12-core processor, 32GB RAM, 1TB NVMe SSD, and Retina display.',
      price: 1299.0,
      compareAtPrice: 1449.0,
      stock: 18,
      categorySlug: 'laptops-computers',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'UltraBook Air 13-inch Notebook',
      slug: 'ultrabook-air-13-notebook',
      sku: 'NEX-LAP-002',
      description: 'Ultralight 1.1kg laptop featuring silent fanless cooling, 18-hour battery life, and Thunderbolt 4 connectivity.',
      price: 899.0,
      compareAtPrice: null,
      stock: 35,
      categorySlug: 'laptops-computers',
      image: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Station 27-inch 4K IPS Monitor',
      slug: 'station-27-4k-ips-monitor',
      sku: 'NEX-MON-001',
      description: 'Color-calibrated 27-inch 4K UHD IPS display with USB-C 90W power delivery and ergonomic height-adjust stand.',
      price: 449.0,
      compareAtPrice: 529.0,
      stock: 14,
      categorySlug: 'laptops-computers',
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Command Workstation Tower PC',
      slug: 'command-workstation-tower-pc',
      sku: 'NEX-PC-001',
      description: 'High-performance desktop tower equipped with 16-core CPU, dedicated GPU, liquid cooling, and 64GB DDR5 RAM.',
      price: 1899.0,
      compareAtPrice: null,
      stock: 5,
      categorySlug: 'laptops-computers',
      image: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=600&auto=format&fit=crop&q=80',
    },

    // Gaming
    {
      name: 'HyperStrike Mechanical Gaming Keyboard',
      slug: 'hyperstrike-mechanical-gaming-keyboard',
      sku: 'NEX-GAM-001',
      description: 'Tactile mechanical switches with per-key RGB backlighting, durable PBT keycaps, and detachable braided USB-C cable.',
      price: 129.0,
      compareAtPrice: 159.0,
      stock: 50,
      categorySlug: 'gaming',
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Precision Pro Wireless Gaming Mouse',
      slug: 'precision-pro-wireless-gaming-mouse',
      sku: 'NEX-GAM-002',
      description: 'Ultra-lightweight 63g gaming mouse with 26,000 DPI optical sensor, low latency 2.4GHz wireless, and PTFE feet.',
      price: 79.0,
      compareAtPrice: null,
      stock: 65,
      categorySlug: 'gaming',
      image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Apex Pro 34-inch Ultrawide Gaming Monitor',
      slug: 'apex-pro-34-ultrawide-gaming-monitor',
      sku: 'NEX-GAM-003',
      description: 'Curved WQHD (3440x1440) 165Hz 1ms gaming monitor with HDR400 and G-Sync compatibility.',
      price: 799.0,
      compareAtPrice: 899.0,
      stock: 8,
      categorySlug: 'gaming',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Phantom 7.1 Surround Gaming Headset',
      slug: 'phantom-71-surround-gaming-headset',
      sku: 'NEX-GAM-004',
      description: 'Memory foam ear cushions, 50mm neodymium drivers, detachable noise-canceling mic, and multi-platform compatibility.',
      price: 99.0,
      compareAtPrice: null,
      stock: 3, // Low stock demo
      categorySlug: 'gaming',
      image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&auto=format&fit=crop&q=80',
    },

    // Audio & Acoustics
    {
      name: 'SonicPro Noise-Canceling Headphones',
      slug: 'sonicpro-noise-canceling-headphones',
      sku: 'NEX-AUD-001',
      description: 'Active Noise Cancellation over-ear headphones with custom 40mm drivers, 30-hour playback, and wear detection.',
      price: 249.0,
      compareAtPrice: 299.0,
      stock: 30,
      categorySlug: 'audio',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'PureSound True Wireless Earbuds',
      slug: 'puresound-true-wireless-earbuds',
      sku: 'NEX-AUD-002',
      description: 'In-ear Bluetooth 5.3 earbuds featuring spatial audio, IPX5 sweat resistance, and wireless charging case.',
      price: 119.0,
      compareAtPrice: null,
      stock: 45,
      categorySlug: 'audio',
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'StudioMonitor Hi-Fi Desktop Speakers',
      slug: 'studiomonitor-hifi-desktop-speakers',
      sku: 'NEX-AUD-003',
      description: 'Pair of powered desktop studio monitors with silk dome tweeters, acoustic wood enclosure, and Bluetooth 5.0.',
      price: 199.0,
      compareAtPrice: 239.0,
      stock: 15,
      categorySlug: 'audio',
      image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'BoomBass Waterproof Bluetooth Speaker',
      slug: 'boombass-waterproof-bluetooth-speaker',
      sku: 'NEX-AUD-004',
      description: 'Rugged IP67 dust & waterproof portable speaker with passive radiators and 20-hour battery life.',
      price: 89.0,
      compareAtPrice: null,
      stock: 0, // Out of stock demo
      categorySlug: 'audio',
      image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&auto=format&fit=crop&q=80',
    },

    // Accessories
    {
      name: 'MultiPort 7-in-1 USB-C Hub Adapter',
      slug: 'multiport-7in1-usbc-hub-adapter',
      sku: 'NEX-ACC-001',
      description: 'Aluminum USB-C hub featuring 4K 60Hz HDMI output, 100W Power Delivery pass-through, SD card reader, and USB-A 3.0.',
      price: 49.0,
      compareAtPrice: null,
      stock: 100,
      categorySlug: 'accessories',
      image: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'PowerBank 20,000mAh 65W Fast Charger',
      slug: 'powerbank-20000mah-65w-fast-charger',
      sku: 'NEX-ACC-002',
      description: 'High-capacity external battery capable of charging laptops, tablets, and phones simultaneously with LED display.',
      price: 59.0,
      compareAtPrice: 69.0,
      stock: 70,
      categorySlug: 'accessories',
      image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'ErgoTouch Ergonomic Vertical Mouse',
      slug: 'ergotouch-ergonomic-vertical-mouse',
      sku: 'NEX-ACC-003',
      description: 'Reduces wrist strain with natural 57-degree handshake grip angle, optical tracking, and silent clicks.',
      price: 39.0,
      compareAtPrice: null,
      stock: 25,
      categorySlug: 'accessories',
      image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'SlimType Bluetooth Wireless Keyboard',
      slug: 'slimtype-bluetooth-wireless-keyboard',
      sku: 'NEX-ACC-004',
      description: 'Ultra-slim dual-device wireless keyboard compatible with macOS, Windows, iOS, and Android.',
      price: 69.0,
      compareAtPrice: 79.0,
      stock: 4, // Low stock demo
      categorySlug: 'accessories',
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
    },

    // Home & Office
    {
      name: 'ErgoPosture Mesh Office Chair',
      slug: 'ergoposture-mesh-office-chair',
      sku: 'NEX-OFF-001',
      description: 'Breathable mesh back executive chair with adjustable 3D armrests, lumbar support, and pneumatic height control.',
      price: 299.0,
      compareAtPrice: 349.0,
      stock: 20,
      categorySlug: 'home-office',
      image: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Lumina LED Smart Desk Lamp',
      slug: 'lumina-led-smart-desk-lamp',
      sku: 'NEX-OFF-002',
      description: 'Eye-care LED lamp with adjustable color temperature, touch control slider, auto-dimming sensor, and USB charging port.',
      price: 59.0,
      compareAtPrice: null,
      stock: 35,
      categorySlug: 'home-office',
      image: 'https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'StreamCam 4K Ultra HD Webcam',
      slug: 'streamcam-4k-ultra-hd-webcam',
      sku: 'NEX-OFF-003',
      description: 'Autofocus 4K sensor with dual omnidirectional microphones, privacy shutter, and HDR video enhancement.',
      price: 149.0,
      compareAtPrice: 179.0,
      stock: 22,
      categorySlug: 'home-office',
      image: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Desktop Leather Writing Pad & Organizer',
      slug: 'desktop-leather-writing-pad-organizer',
      sku: 'NEX-OFF-004',
      description: 'Waterproof PU leather desk pad (90x40cm) providing smooth mouse surface and desk scratch protection.',
      price: 34.0,
      compareAtPrice: null,
      stock: 60,
      categorySlug: 'home-office',
      image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
    },

    // Smartwatches & Wearables
    {
      name: 'PulsePro Fitness & Heart Rate Smartwatch',
      slug: 'pulsepro-fitness-heart-rate-smartwatch',
      sku: 'NEX-WR-001',
      description: 'Always-on 1.4-inch AMOLED display, SpO2 blood oxygen sensor, 50m water resistance, and 7-day battery life.',
      price: 199.0,
      compareAtPrice: 229.0,
      stock: 28,
      categorySlug: 'wearables',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Vanguard Sapphire Active Smartwatch',
      slug: 'vanguard-sapphire-active-smartwatch',
      sku: 'NEX-WR-002',
      description: 'Titanium case with scratch-resistant sapphire crystal lens, dual-frequency GPS, and ECG monitoring.',
      price: 349.0,
      compareAtPrice: null,
      stock: 16,
      categorySlug: 'wearables',
      image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'FitBand Light Fitness Tracker',
      slug: 'fitband-light-fitness-tracker',
      sku: 'NEX-WR-003',
      description: 'Ultralight activity tracker monitoring steps, sleep cycles, calories burned, and smartphone notifications.',
      price: 49.0,
      compareAtPrice: 59.0,
      stock: 50,
      categorySlug: 'wearables',
      image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Titan Ultra Tough GPS Adventure Watch',
      slug: 'titan-ultra-tough-gps-adventure-watch',
      sku: 'NEX-WR-004',
      description: 'Military-grade shock resistance, offline topographic maps, solar charging panel, and 30-day expedition mode.',
      price: 499.0,
      compareAtPrice: null,
      stock: 2, // Low stock demo
      categorySlug: 'wearables',
      image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Horizon Pro Foldable Wireless Charger',
      slug: 'horizon-pro-foldable-wireless-charger',
      sku: 'NEX-ACC-005',
      description: '3-in-1 magnetic wireless charging station for smartphone, smartwatch, and earbuds with LED status indicators.',
      price: 79.0,
      compareAtPrice: 99.0,
      stock: 40,
      categorySlug: 'accessories',
      image: 'https://images.unsplash.com/photo-1616410011236-7a42121dd981?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'AuraSound Spatial Audio Soundbar',
      slug: 'aurasound-spatial-audio-soundbar',
      sku: 'NEX-AUD-005',
      description: 'Compact desktop & TV soundbar with Dolby Atmos virtualization, wireless subwoofer, and HDMI eARC.',
      price: 299.0,
      compareAtPrice: 349.0,
      stock: 18,
      categorySlug: 'audio',
      image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
    },
  ];

  let seededProductsCount = 0;

  for (const prodData of productsData) {
    const categoryId = categoryMap.get(prodData.categorySlug) ?? null;
    await prisma.product.upsert({
      where: { sku: prodData.sku },
      update: {
        name: prodData.name,
        slug: prodData.slug,
        description: prodData.description,
        price: prodData.price,
        compareAtPrice: prodData.compareAtPrice,
        stock: prodData.stock,
        image: prodData.image,
        categoryId,
        isActive: true,
      },
      create: {
        name: prodData.name,
        slug: prodData.slug,
        sku: prodData.sku,
        description: prodData.description,
        price: prodData.price,
        compareAtPrice: prodData.compareAtPrice,
        stock: prodData.stock,
        image: prodData.image,
        categoryId,
        isActive: true,
      },
    });
    seededProductsCount++;
  }

  console.log(`✓ Seeded ${seededProductsCount} catalog products`);

  // 4. Seed Demo Coupons
  const couponsData = [
    {
      code: 'WELCOME10',
      type: CouponType.PERCENTAGE,
      value: 10.0,
      minOrderAmount: 50.0,
      usageLimit: 500,
    },
    {
      code: 'NEXORA15',
      type: CouponType.PERCENTAGE,
      value: 15.0,
      minOrderAmount: 100.0,
      usageLimit: 200,
    },
    {
      code: 'SAVE20',
      type: CouponType.FIXED,
      value: 20.0,
      minOrderAmount: 150.0,
      usageLimit: 100,
    },
  ];

  for (const coupon of couponsData) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        type: coupon.type,
        value: coupon.value,
        minOrderAmount: coupon.minOrderAmount,
        usageLimit: coupon.usageLimit,
        isActive: true,
      },
      create: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrderAmount: coupon.minOrderAmount,
        usageLimit: coupon.usageLimit,
        isActive: true,
      },
    });
  }

  console.log(`✓ Seeded ${couponsData.length} coupons`);

  // 5. Seed Product Reviews
  const flagshipPhone = await prisma.product.findUnique({ where: { sku: 'NEX-PHN-001' } });
  const proLaptop = await prisma.product.findUnique({ where: { sku: 'NEX-LAP-001' } });
  const headphones = await prisma.product.findUnique({ where: { sku: 'NEX-AUD-001' } });

  if (flagshipPhone) {
    await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: demoUser.id,
          productId: flagshipPhone.id,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        productId: flagshipPhone.id,
        rating: 5,
        comment: 'Extremely fast 120Hz display and outstanding battery life. Highly recommended!',
        isApproved: true,
      },
    });
  }

  if (proLaptop) {
    await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: demoUser.id,
          productId: proLaptop.id,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        productId: proLaptop.id,
        rating: 5,
        comment: 'Solid aluminum build and impressive performance for development work.',
        isApproved: true,
      },
    });
  }

  if (headphones) {
    await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: demoUser.id,
          productId: headphones.id,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        productId: headphones.id,
        rating: 4,
        comment: 'Great noise cancellation for office environments. Very comfortable fit.',
        isApproved: true,
      },
    });
  }

  console.log('✓ Seeded customer product reviews');

  console.log('🎉 Nexora Commerce database successfully populated!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
