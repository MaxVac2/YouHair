-- Add hair color to profiles
ALTER TABLE public.hair_profiles
  ADD COLUMN IF NOT EXISTS hair_color text;

-- Seed YouHair products
INSERT INTO public.products (name, slug, description, price, image_url, category, hair_types, concerns, stock)
VALUES
  (
    'Texture Powder',
    'texture-powder',
    'Weightless powder for lift, matte texture, and volume.',
    24.00,
    NULL,
    'styling',
    ARRAY['straight','wavy','curly','coily'],
    ARRAY['volume'],
    100
  ),
  (
    'Sea Salt Spray',
    'sea-salt-spray',
    'Beachy waves and grit with a soft, touchable hold.',
    22.00,
    NULL,
    'styling',
    ARRAY['straight','wavy','curly'],
    ARRAY['volume','oily'],
    100
  ),
  (
    'Hair Clay',
    'hair-clay',
    'Flexible clay for separation, control, and natural texture.',
    26.00,
    NULL,
    'styling',
    ARRAY['straight','wavy'],
    ARRAY['frizz','volume'],
    100
  ),
  (
    'Pomade',
    'pomade',
    'High-shine pomade for sleek styles and polished finishes.',
    25.00,
    NULL,
    'styling',
    ARRAY['straight','wavy'],
    ARRAY['frizz'],
    100
  ),
  (
    'Leave-In Conditioner',
    'leave-in-conditioner',
    'Hydrating leave-in for softness, slip, and easy detangling.',
    28.00,
    NULL,
    'treatment',
    ARRAY['straight','wavy','curly','coily'],
    ARRAY['dry','damage','frizz'],
    100
  ),
  (
    'Curl Cream',
    'curl-cream',
    'Defines curls with plush moisture and soft hold.',
    27.00,
    NULL,
    'curl',
    ARRAY['wavy','curly','coily'],
    ARRAY['frizz','dry'],
    100
  ),
  (
    'Curl Mousse',
    'curl-mousse',
    'Lightweight mousse for airy curl volume and bounce.',
    24.00,
    NULL,
    'curl',
    ARRAY['wavy','curly','coily'],
    ARRAY['volume','frizz'],
    100
  ),
  (
    'Curl Gel',
    'curl-gel',
    'Strong-hold gel for frizz-free definition and shine.',
    23.00,
    NULL,
    'curl',
    ARRAY['wavy','curly','coily'],
    ARRAY['frizz'],
    100
  ),
  (
    'Curl Refresh Spray',
    'curl-refresh-spray',
    'Revives curls between wash days with instant moisture.',
    21.00,
    NULL,
    'curl',
    ARRAY['wavy','curly','coily'],
    ARRAY['dry','frizz'],
    100
  ),
  (
    'Hair Die',
    'hair-die',
    'Bold color refresh for vivid tones and creative looks.',
    32.00,
    NULL,
    'color',
    ARRAY['straight','wavy','curly','coily'],
    ARRAY['color-treated'],
    100
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  category = EXCLUDED.category,
  hair_types = EXCLUDED.hair_types,
  concerns = EXCLUDED.concerns,
  stock = EXCLUDED.stock,
  updated_at = now();
