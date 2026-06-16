import { supabase } from '../config/supabase.js';

async function seed() {
  console.log('Seeding database with sample data...');

  try {
    // 1. Insert sample users (using upsert on firebase_uid to avoid duplicates on multiple runs)
    const { data: users, error: userError } = await supabase
      .from('users')
      .upsert(
        [
          {
            firebase_uid: 'dummy_firebase_seller_123',
            name: 'Sam Seller',
            email: 'sam@example.com',
            phone: '1234567890',
            role: 'seller',
          },
          {
            firebase_uid: 'dummy_firebase_buyer_456',
            name: 'Bob Buyer',
            email: 'bob@example.com',
            phone: '0987654321',
            role: 'buyer',
          },
        ],
        { onConflict: 'firebase_uid' }
      )
      .select();

    if (userError) throw userError;
    console.log(`Inserted/Upserted ${users.length} users.`);

    const seller = users.find((u) => u.role === 'seller');
    const buyer = users.find((u) => u.role === 'buyer');

    // 2. Insert sample pets
    const { data: pets, error: petError } = await supabase
      .from('pets')
      .insert([
        {
          seller_id: seller.id,
          name: 'Buddy',
          species: 'Dog',
          breed: 'Golden Retriever',
          age: 2,
          gender: 'Male',
          price: 5000,
          description: 'A very friendly and energetic dog.',
          listing_type: 'sale',
          status: 'available',
        },
        {
          seller_id: seller.id,
          name: 'Luna',
          species: 'Cat',
          breed: 'Persian',
          age: 1,
          gender: 'Female',
          description: 'A quiet and calm cat looking for a loving home.',
          listing_type: 'adoption',
          status: 'available',
        },
      ])
      .select();

    if (petError) throw petError;
    console.log(`Inserted ${pets.length} pets.`);

    const salePet = pets.find((p) => p.listing_type === 'sale');

    // 3. Insert a sample order for the sale pet
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          buyer_id: buyer.id,
          pet_id: salePet.id,
          amount: salePet.price,
          status: 'created',
          razorpay_order_id: 'order_dummy_12345',
        },
      ])
      .select();

    if (orderError) throw orderError;
    console.log(`Inserted 1 order for pet: ${salePet.name}.`);

    console.log('✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();
