-- Publish the researched species with complete taxonomy, lead media and
-- verified licensing.
--
-- Taxonomy (family, genus) was read from each species' Wikidata taxon chain and
-- confirmed to sit at family rank. Lead images come from Wikimedia Commons with
-- their licence recorded; the original file page is kept as the source URL.
--
-- Media url may now be a root-relative path so the prototype can serve optimised
-- local copies instead of hotlinking. Provenance is still required: approved
-- media must keep source_url, photographer, licence and attribution.

alter table public.species_media drop constraint if exists species_media_check;
alter table public.species_media add constraint species_media_approved_check check (
  not approved or (
    (url ~ '^https?://[^/[:space:]]+' or url ~ '^/images/[a-z0-9/_-]+[.][a-z]+$')
    and source_url ~ '^https?://[^/[:space:]]+'
    and nullif(btrim(alt_id), '') is not null
    and nullif(btrim(photographer), '') is not null
    and nullif(btrim(license_code), '') is not null
    and nullif(btrim(attribution_text), '') is not null
  )
);

-- badak-jawa
update public.species set family = 'Rhinocerotidae', genus = 'Rhinoceros'
where slug = 'badak-jawa';

insert into public.species_media (id, species_id, url, alt_id, photographer, source_url, license_code, license_url, attribution_text, position_x, position_y, sort_order, approved)
select '9d6485cb-39c5-8907-a240-4cff68745643', s.id, '/images/species/badak-jawa.jpg', 'Badak jawa bercula satu di kebun binatang London, tampak dari samping.', 'T.Dixon. The Zoological Society of London', 'https://commons.wikimedia.org/wiki/File:Rhinoceros_sondaicus_in_London_Zoo.jpg', 'Public domain', 'https://creativecommons.org/publicdomain/mark/1.0/', 'T.Dixon. The Zoological Society of London / Wikimedia Commons, Public domain', 50, 50, 0, true
from public.species s
where s.slug = 'badak-jawa'
  and not exists (select 1 from public.species_media x where x.species_id = s.id and x.url = '/images/species/badak-jawa.jpg');

-- badak-sumatra
update public.species set family = 'Rhinocerotidae', genus = 'Dicerorhinus'
where slug = 'badak-sumatra';

insert into public.species_media (id, species_id, url, alt_id, photographer, source_url, license_code, license_url, attribution_text, position_x, position_y, sort_order, approved)
select '9a1c1c81-b5e7-8140-a9e1-eb214d01bea3', s.id, '/images/species/badak-sumatra.jpg', 'Badak sumatra berambut di Suaka Rhino Sumatra, Lampung.', '26Isabella', 'https://commons.wikimedia.org/wiki/File:Sumatran_Rhinoceros_at_Sumatran_Rhino_Sanctuary_Lampung_Indonesia_2013.JPG', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', '26Isabella / Wikimedia Commons, CC BY-SA 3.0', 50, 50, 0, true
from public.species s
where s.slug = 'badak-sumatra'
  and not exists (select 1 from public.species_media x where x.species_id = s.id and x.url = '/images/species/badak-sumatra.jpg');

-- orangutan-sumatra
update public.species set family = 'Hominidae', genus = 'Pongo'
where slug = 'orangutan-sumatra';

insert into public.species_media (id, species_id, url, alt_id, photographer, source_url, license_code, license_url, attribution_text, position_x, position_y, sort_order, approved)
select '9de0d47c-517b-82d8-affa-2441ad85c917', s.id, '/images/species/orangutan-sumatra.jpg', 'Orangutan sumatra berambut panjang di Pongoland.', 'Fiver, der Hellseher', 'https://commons.wikimedia.org/wiki/File:Sumatra-Orang-Utan_im_Pongoland.jpg', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'Fiver, der Hellseher / Wikimedia Commons, CC BY-SA 4.0', 50, 50, 0, true
from public.species s
where s.slug = 'orangutan-sumatra'
  and not exists (select 1 from public.species_media x where x.species_id = s.id and x.url = '/images/species/orangutan-sumatra.jpg');

-- orangutan-kalimantan
update public.species set family = 'Hominidae', genus = 'Pongo'
where slug = 'orangutan-kalimantan';

insert into public.species_media (id, species_id, url, alt_id, photographer, source_url, license_code, license_url, attribution_text, position_x, position_y, sort_order, approved)
select 'e35b0262-a4a0-8dc7-a8fd-999289e844ac', s.id, '/images/species/orangutan-kalimantan.jpg', 'Orangutan kalimantan di Taman Nasional Tanjung Puting.', 'Nanosanchez', 'https://commons.wikimedia.org/wiki/File:Tanjung_Puting30477.jpg', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'Nanosanchez / Wikimedia Commons, CC BY-SA 4.0', 50, 50, 0, true
from public.species s
where s.slug = 'orangutan-kalimantan'
  and not exists (select 1 from public.species_media x where x.species_id = s.id and x.url = '/images/species/orangutan-kalimantan.jpg');

-- komodo
update public.species set family = 'Varanidae', genus = 'Varanus'
where slug = 'komodo';

insert into public.species_media (id, species_id, url, alt_id, photographer, source_url, license_code, license_url, attribution_text, position_x, position_y, sort_order, approved)
select 'fdf593fb-4f70-878e-a376-239839abb672', s.id, '/images/species/komodo.jpg', 'Komodo berjalan di tanah terbuka dengan lidah terjulur.', 'James Jolokia (james1203)', 'https://commons.wikimedia.org/wiki/File:202306_Varanus_komodoensis.jpg', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/', 'James Jolokia (james1203) / Wikimedia Commons, CC BY 4.0', 50, 50, 0, true
from public.species s
where s.slug = 'komodo'
  and not exists (select 1 from public.species_media x where x.species_id = s.id and x.url = '/images/species/komodo.jpg');

-- anoa-dataran-rendah
update public.species set family = 'Bovidae', genus = 'Bubalus'
where slug = 'anoa-dataran-rendah';

insert into public.species_media (id, species_id, url, alt_id, photographer, source_url, license_code, license_url, attribution_text, position_x, position_y, sort_order, approved)
select '229a2425-68cf-8518-a0cc-8cd6f50d7501', s.id, '/images/species/anoa-dataran-rendah.jpg', 'Anoa dataran rendah berbulu gelap di Kebun Binatang Surabaya.', 'Sakurai Midori', 'https://commons.wikimedia.org/wiki/File:Anoa_Bubalus_depressicornis_Surabaya_Zoo.jpg', 'CC BY 3.0', 'https://creativecommons.org/licenses/by/3.0/', 'Sakurai Midori / Wikimedia Commons, CC BY 3.0', 50, 50, 0, true
from public.species s
where s.slug = 'anoa-dataran-rendah'
  and not exists (select 1 from public.species_media x where x.species_id = s.id and x.url = '/images/species/anoa-dataran-rendah.jpg');

-- jalak-bali
update public.species set family = 'Sturnidae', genus = 'Leucopsar'
where slug = 'jalak-bali';

insert into public.species_media (id, species_id, url, alt_id, photographer, source_url, license_code, license_url, attribution_text, position_x, position_y, sort_order, approved)
select '031a1a64-a788-8852-a05b-a49c1f0d6473', s.id, '/images/species/jalak-bali.jpg', 'Jalak bali berbulu putih dengan kulit biru di sekitar mata.', 'JJ Harrison', 'https://commons.wikimedia.org/wiki/File:Bali_Myna_0A2A9443.jpg', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', 'JJ Harrison / Wikimedia Commons, CC BY-SA 3.0', 50, 50, 0, true
from public.species s
where s.slug = 'jalak-bali'
  and not exists (select 1 from public.species_media x where x.species_id = s.id and x.url = '/images/species/jalak-bali.jpg');

-- babirusa-sulawesi
update public.species set family = 'Suidae', genus = 'Babyrousa'
where slug = 'babirusa-sulawesi';

insert into public.species_media (id, species_id, url, alt_id, photographer, source_url, license_code, license_url, attribution_text, position_x, position_y, sort_order, approved)
select '93d91754-627f-8947-aab6-96a4b0697769', s.id, '/images/species/babirusa-sulawesi.jpg', 'Babirusa sulawesi jantan dengan taring atas melengkung ke belakang.', 'Masteraah at German Wikipedia', 'https://commons.wikimedia.org/wiki/File:Hirscheber1a.jpg', 'CC BY-SA 2.0 de', 'https://creativecommons.org/licenses/by-sa/2.0/de/', 'Masteraah at German Wikipedia / Wikimedia Commons, CC BY-SA 2.0 de', 50, 50, 0, true
from public.species s
where s.slug = 'babirusa-sulawesi'
  and not exists (select 1 from public.species_media x where x.species_id = s.id and x.url = '/images/species/babirusa-sulawesi.jpg');

-- maleo
update public.species set family = 'Megapodiidae', genus = 'Macrocephalon'
where slug = 'maleo';

insert into public.species_media (id, species_id, url, alt_id, photographer, source_url, license_code, license_url, attribution_text, position_x, position_y, sort_order, approved)
select '617c5ef5-76d6-880f-af13-c8e7183948a3', s.id, '/images/species/maleo.jpg', 'Maleo berdiri di tanah terbuka dekat Muara Pusian.', 'Ariefrahman', 'https://commons.wikimedia.org/wiki/File:Macrocephalon_maleo_-_Muara_Pusian_(2).JPG', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'Ariefrahman / Wikimedia Commons, CC BY-SA 4.0', 50, 50, 0, true
from public.species s
where s.slug = 'maleo'
  and not exists (select 1 from public.species_media x where x.species_id = s.id and x.url = '/images/species/maleo.jpg');

-- siamang
update public.species set family = 'Hylobatidae', genus = 'Symphalangus'
where slug = 'siamang';

insert into public.species_media (id, species_id, url, alt_id, photographer, source_url, license_code, license_url, attribution_text, position_x, position_y, sort_order, approved)
select '642b1dcc-b0f9-801f-a5d9-d1d869275e1f', s.id, '/images/species/siamang.jpg', 'Siamang berbulu hitam bergelantungan di Tierpark Hellabrunn.', 'Rufus46', 'https://commons.wikimedia.org/wiki/File:Siamang_Tierpark_Hellabrunn-4.jpg', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', 'Rufus46 / Wikimedia Commons, CC BY-SA 3.0', 50, 50, 0, true
from public.species s
where s.slug = 'siamang'
  and not exists (select 1 from public.species_media x where x.species_id = s.id and x.url = '/images/species/siamang.jpg');

-- Backfill the Indonesian conservation-actions text before publishing.
-- The translation rows were seeded before this field existed, and the deferred
-- publication trigger requires it to be non-blank. Text is limited to what each
-- species' own sources state: protected areas already named in the habitat copy
-- and the CITES Appendix I listing recorded in the regulation source.
update public.species_translations t
set conservation_actions = 'Populasi liar berada di Taman Nasional Ujung Kulon, kawasan lindung yang disebut sumber sebagai satu-satunya tempat persebaran yang tersisa. Perdagangan internasional dibatasi melalui pencantuman CITES Apendiks I. Sumber tidak menyertakan angka populasi terbaru maupun hasil pemantauan terkini.'
from public.species s
where t.species_id = s.id and t.locale = 'id' and s.slug = 'badak-jawa'
  and (t.conservation_actions is null or btrim(t.conservation_actions) = '');

update public.species_translations t
set conservation_actions = 'International Rhino Foundation menjelaskan program pengembangbiakan di Sumatran Rhino Sanctuary sebagai upaya membangun populasi cadangan. Ini merupakan contoh kegiatan, bukan jaminan pelepasliaran atau pemulihan.'
from public.species s
where t.species_id = s.id and t.locale = 'id' and s.slug = 'badak-sumatra'
  and (t.conservation_actions is null or btrim(t.conservation_actions) = '');

update public.species_translations t
set conservation_actions = 'Lembaga konservasi yang menjadi sumber menyebut program perlindungan dan pemulihan habitat sebagai upaya menjaga populasi. Perdagangan internasional dibatasi melalui CITES Apendiks I. Sumber tidak menyertakan angka populasi terbaru atau hasil pemantauan terkini.'
from public.species s
where t.species_id = s.id and t.locale = 'id' and s.slug = 'orangutan-sumatra'
  and (t.conservation_actions is null or btrim(t.conservation_actions) = '');

update public.species_translations t
set conservation_actions = 'Yayasan konservasi yang menjadi sumber menyebut perlindungan dan pemulihan habitat sebagai upaya menjaga populasi di Borneo. Perdagangan internasional dibatasi melalui CITES Apendiks I. Sumber tidak menyertakan angka populasi terbaru atau hasil pemantauan terkini.'
from public.species s
where t.species_id = s.id and t.locale = 'id' and s.slug = 'orangutan-kalimantan'
  and (t.conservation_actions is null or btrim(t.conservation_actions) = '');

update public.species_translations t
set conservation_actions = 'Sebagian besar persebaran alami berada di Taman Nasional Komodo, kawasan lindung yang disebut sumber. Perdagangan internasional dibatasi melalui CITES Apendiks I. Sumber tidak menyertakan hasil pemantauan populasi terkini.'
from public.species s
where t.species_id = s.id and t.locale = 'id' and s.slug = 'komodo'
  and (t.conservation_actions is null or btrim(t.conservation_actions) = '');

update public.species_translations t
set conservation_actions = 'Balai Besar KSDA Sulawesi Selatan, lembaga konservasi nasional yang menjadi sumber, membahas jenis ini sebagai bagian dari upaya konservasi satwa Sulawesi. Perdagangan internasional dibatasi melalui CITES Apendiks I. Sumber tidak menyertakan angka populasi terbaru.'
from public.species s
where t.species_id = s.id and t.locale = 'id' and s.slug = 'anoa-dataran-rendah'
  and (t.conservation_actions is null or btrim(t.conservation_actions) = '');

update public.species_translations t
set conservation_actions = 'San Diego Zoo Wildlife Alliance melaporkan keterlibatan dalam pengembangbiakan terkelola serta pengiriman burung untuk program di Indonesia. Laporan kegiatan historis ini bukan bukti hasil pemulihan terkini.'
from public.species s
where t.species_id = s.id and t.locale = 'id' and s.slug = 'jalak-bali'
  and (t.conservation_actions is null or btrim(t.conservation_actions) = '');

update public.species_translations t
set conservation_actions = 'Saint Louis Zoo menyatakan mendukung Action Indonesia untuk konservasi babirusa, banteng, dan anoa di habitat asalnya. Pernyataan ini merupakan laporan keterlibatan organisasi, bukan klaim kerja sama dengan Rimba.'
from public.species s
where t.species_id = s.id and t.locale = 'id' and s.slug = 'babirusa-sulawesi'
  and (t.conservation_actions is null or btrim(t.conservation_actions) = '');

update public.species_translations t
set conservation_actions = 'WCS melaporkan pada 2009 bahwa PALS, mitra lokalnya, membeli pantai untuk melindungi tempat peneluran maleo. Ini contoh kegiatan bertanggal, bukan laporan status perlindungan terkini.'
from public.species s
where t.species_id = s.id and t.locale = 'id' and s.slug = 'maleo'
  and (t.conservation_actions is null or btrim(t.conservation_actions) = '');

update public.species_translations t
set conservation_actions = 'Lembaga konservasi yang menjadi sumber menyebut upaya perlindungan habitat dan penanganan perdagangan satwa sebagai fokus konservasi. Perdagangan internasional dibatasi melalui CITES Apendiks I. Sumber tidak menyertakan angka populasi terbaru.'
from public.species s
where t.species_id = s.id and t.locale = 'id' and s.slug = 'siamang'
  and (t.conservation_actions is null or btrim(t.conservation_actions) = '');

-- Publish: translation first, then species, so the deferred trigger sees a
-- complete published Indonesian entry with its source citations in place.
update public.species_translations t
set translation_status = 'published'
from public.species s
where t.species_id = s.id and t.locale = 'id' and s.slug in (
  'badak-jawa',
  'badak-sumatra',
  'orangutan-sumatra',
  'orangutan-kalimantan',
  'komodo',
  'anoa-dataran-rendah',
  'jalak-bali',
  'babirusa-sulawesi',
  'maleo',
  'siamang'
);

update public.species
set status = 'published', published_at = coalesce(published_at, now())
where slug in (
  'badak-jawa',
  'badak-sumatra',
  'orangutan-sumatra',
  'orangutan-kalimantan',
  'komodo',
  'anoa-dataran-rendah',
  'jalak-bali',
  'babirusa-sulawesi',
  'maleo',
  'siamang'
);
