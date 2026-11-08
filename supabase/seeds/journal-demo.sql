insert into public.journal_demo_entries (
  id,
  common_name,
  scientific_name,
  entry_group,
  observed_at,
  region_label,
  image_path,
  image_alt,
  needs_review,
  is_demo
) values
  (
    'd3000000-0000-4000-8000-000000000001',
    'Eceng Gondok',
    'Pontederia crassipes',
    'flora',
    '2026-10-30T08:15:00+07:00',
    'Demo · Sumatra',
    '/images/journal-demo/eceng-gondok.jpg',
    'Gambar demo Eceng Gondok',
    false,
    true
  ),
  (
    'd3000000-0000-4000-8000-000000000002',
    'Orangutan Kalimantan',
    'Pongo pygmaeus',
    'fauna',
    '2026-10-28T09:30:00+07:00',
    'Demo · Kalimantan',
    '/images/journal-demo/orangutan-kalimantan.jpg',
    'Gambar demo Orangutan Kalimantan',
    false,
    true
  ),
  (
    'd3000000-0000-4000-8000-000000000003',
    'Monstera',
    'Monstera deliciosa',
    'flora',
    '2026-10-25T07:40:00+07:00',
    'Demo · Jawa',
    '/images/journal-demo/monstera.jpg',
    'Gambar demo Monstera',
    true,
    true
  ),
  (
    'd3000000-0000-4000-8000-000000000004',
    'Babirusa Sulawesi',
    'Babyrousa celebensis',
    'fauna',
    '2026-10-22T10:00:00+07:00',
    'Demo · Sulawesi',
    '/images/journal-demo/babirusa-sulawesi.jpg',
    'Gambar demo Babirusa Sulawesi',
    false,
    true
  ),
  (
    'd3000000-0000-4000-8000-000000000005',
    'Paku Sarang Burung',
    'Asplenium nidus',
    'flora',
    '2026-10-20T06:45:00+07:00',
    'Demo · Bali',
    '/images/journal-demo/paku-sarang-burung.jpg',
    'Gambar demo Paku Sarang Burung',
    true,
    true
  ),
  (
    'd3000000-0000-4000-8000-000000000006',
    'Jalak Bali',
    'Leucopsar rothschildi',
    'fauna',
    '2026-10-16T15:20:00+07:00',
    'Demo · Bali',
    '/images/journal-demo/jalak-bali.jpg',
    'Gambar demo Jalak Bali',
    false,
    true
  )
on conflict (id) do nothing;
