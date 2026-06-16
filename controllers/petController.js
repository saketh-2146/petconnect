import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import Joi from 'joi';

// Validation Schemas
export const createPetSchema = Joi.object({
  name: Joi.string().required(),
  species: Joi.string().required(),
  breed: Joi.string().allow('').optional(),
  age: Joi.number().integer().min(0).optional(),
  gender: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
  description: Joi.string().allow('').optional(),
  image_urls: Joi.array().items(Joi.string().uri()).optional(),
  listing_type: Joi.string().valid('sale', 'adoption').required(),
  status: Joi.string().valid('available', 'pending', 'sold', 'adopted').default('available'),
});

export const updatePetSchema = Joi.object({
  name: Joi.string().optional(),
  species: Joi.string().optional(),
  breed: Joi.string().allow('').optional(),
  age: Joi.number().integer().min(0).optional(),
  gender: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
  description: Joi.string().allow('').optional(),
  image_urls: Joi.array().items(Joi.string().uri()).optional(),
  listing_type: Joi.string().valid('sale', 'adoption').optional(),
  status: Joi.string().valid('available', 'pending', 'sold', 'adopted').optional(),
});

// @route   POST /api/pets
export const createPet = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('pets')
    .insert([{ ...req.body, seller_id: req.user.id }])
    .select()
    .single();

  if (error) {
    throw Object.assign(new Error(`Failed to create pet listing: ${error.message}`), { status: 500 });
  }
  
  res.status(201).json(data);
});

// @route   GET /api/pets
export const getPets = asyncHandler(async (req, res) => {
  const { species, breed, listing_type, status, min_price, max_price, page = 1, limit = 10 } = req.query;
  
  let query = supabase.from('pets').select('*', { count: 'exact' });

  if (species) query = query.eq('species', species);
  if (breed) query = query.ilike('breed', `%${breed}%`);
  if (listing_type) query = query.eq('listing_type', listing_type);
  if (status) query = query.eq('status', status);
  if (min_price) query = query.gte('price', min_price);
  if (max_price) query = query.lte('price', max_price);

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to).order('created_at', { ascending: false });

  const { data, count, error } = await query;
  if (error) throw Object.assign(new Error(`Fetch error: ${error.message}`), { status: 500 });

  res.status(200).json({ data, count, page: Number(page), limit: Number(limit) });
});

// @route   GET /api/pets/mine
export const getMyPets = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('seller_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) throw Object.assign(new Error(`Fetch error: ${error.message}`), { status: 500 });
  res.status(200).json(data);
});

// @route   GET /api/pets/:id
export const getPetById = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('pets')
    .select('*, users!seller_id(name, email, phone)') // join seller details
    .eq('id', req.params.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Pet listing not found' });
    }
    throw Object.assign(new Error(`Fetch error: ${error.message}`), { status: 500 });
  }

  res.status(200).json(data);
});

// Helper function to check if the current user owns the pet listing
const checkOwnership = async (petId, user) => {
  if (user.role === 'admin') return true;
  
  const { data, error } = await supabase
    .from('pets')
    .select('seller_id')
    .eq('id', petId)
    .single();
    
  if (error || !data) return false;
  return data.seller_id === user.id;
};

// @route   PATCH /api/pets/:id
export const updatePet = asyncHandler(async (req, res) => {
  const isOwner = await checkOwnership(req.params.id, req.user);
  if (!isOwner) {
    return res.status(403).json({ error: 'Forbidden: You do not own this listing' });
  }

  const { data, error } = await supabase
    .from('pets')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) throw Object.assign(new Error(`Update error: ${error.message}`), { status: 500 });
  res.status(200).json(data);
});

// @route   DELETE /api/pets/:id
export const deletePet = asyncHandler(async (req, res) => {
  const isOwner = await checkOwnership(req.params.id, req.user);
  if (!isOwner) {
    return res.status(403).json({ error: 'Forbidden: You do not own this listing' });
  }

  const { error } = await supabase.from('pets').delete().eq('id', req.params.id);
  if (error) throw Object.assign(new Error(`Delete error: ${error.message}`), { status: 500 });

  res.status(200).json({ message: 'Pet listing deleted successfully' });
});
