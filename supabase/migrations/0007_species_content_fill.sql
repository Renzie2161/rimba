-- Fill verified conservation, ecological and regulatory data.
--
-- Every value comes from a published record: IUCN Red List assessments
-- (DOI-cited, with assessment year) and CITES Appendix I listings. No population
-- figures, trends or legal claims are inferred.
--
-- Species publication state is untouched: this completes the data existing
-- records carry, so a draft stays a draft until an owner approves publication.
-- Idempotent: sources are inserted only when their URL is absent, links are
-- inserted only when absent, and the current assessment is replaced in place.

-- badak-jawa
insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select 'af9cf5cd-2b50-805d-a895-b1c6d82c485f', 'IUCN Red List of Threatened Species', 'Rhinoceros sondaicus — IUCN Red List assessment', 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T19495A18493900.en', null, '2026-11-09', null, 'Source claim: IUCN Red List extinction risk category and assessment year. Year and citation DOI read from the published IUCN assessment record. No population figures imported.'
where not exists (select 1 from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T19495A18493900.en');

insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select '20ffb5df-aba0-8c8d-a4bd-50792462c703', 'CITES', 'Appendices I, II and III', 'https://cites.org/eng/app/appendices.php', null, '2026-11-09', null, 'Source claim: listing in CITES Appendix I. Verified from the species taxobox citing cites.org. No trade data imported.'
where not exists (select 1 from public.sources where url = 'https://cites.org/eng/app/appendices.php');

insert into public.species_sources (species_id, source_id, section_key)
select s.id, src.id, v.section_key
from public.species s
cross join (values ('https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T19495A18493900.en', 'assessment'), ('https://cites.org/eng/app/appendices.php', 'regulation')) as v(url, section_key)
join public.sources src on src.url = v.url
where s.slug = 'badak-jawa'
on conflict do nothing;

delete from public.conservation_assessments ca
using public.species s
where ca.species_id = s.id and ca.is_current and s.slug = 'badak-jawa';

insert into public.conservation_assessments (id, species_id, status_code, assessment_year, source_id, is_current)
select 'e6852db3-b50e-8c90-a3bc-26cd63ac0806', s.id, 'CR', 2020, src.id, true
from public.species s
join public.sources src on src.url = 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T19495A18493900.en'
where s.slug = 'badak-jawa';

update public.species set
  indonesia_ecological_status = 'native',
  ecological_source_id = (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T19495A18493900.en' limit 1),
  regulation_status = 'CITES Apendiks I',
  regulation_source_id = (select id from public.sources where url = 'https://cites.org/eng/app/appendices.php' limit 1),
  ecosystem_role = 'Herbivora besar yang memakan bagian tumbuhan hutan.',
  ecosystem_source_id = coalesce(
    (select ss.source_id from public.species_sources ss
      join public.sources src on src.id = ss.source_id
      join public.species sp on sp.id = ss.species_id
      where sp.slug = 'badak-jawa' and src.url = 'https://rhinos.org/about-rhinos/rhino-species/javan-rhino/' limit 1),
    (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T19495A18493900.en' limit 1)
  )
where slug = 'badak-jawa';

-- badak-sumatra
insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select 'abde0406-2854-8b1a-ad55-b597d198e286', 'IUCN Red List of Threatened Species', 'Dicerorhinus sumatrensis — IUCN Red List assessment', 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T6553A18493355.en', null, '2026-11-09', null, 'Source claim: IUCN Red List extinction risk category and assessment year. Year and citation DOI read from the published IUCN assessment record. No population figures imported.'
where not exists (select 1 from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T6553A18493355.en');

insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select 'bba2fa99-d020-8d36-ac6f-a549448ce6a4', 'CITES', 'Appendices I, II and III', 'https://cites.org/eng/app/appendices.php', null, '2026-11-09', null, 'Source claim: listing in CITES Appendix I. Verified from the species taxobox citing cites.org. No trade data imported.'
where not exists (select 1 from public.sources where url = 'https://cites.org/eng/app/appendices.php');

insert into public.species_sources (species_id, source_id, section_key)
select s.id, src.id, v.section_key
from public.species s
cross join (values ('https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T6553A18493355.en', 'assessment'), ('https://cites.org/eng/app/appendices.php', 'regulation')) as v(url, section_key)
join public.sources src on src.url = v.url
where s.slug = 'badak-sumatra'
on conflict do nothing;

delete from public.conservation_assessments ca
using public.species s
where ca.species_id = s.id and ca.is_current and s.slug = 'badak-sumatra';

insert into public.conservation_assessments (id, species_id, status_code, assessment_year, source_id, is_current)
select '852deaca-7dd1-84c4-a925-09917cb9386e', s.id, 'CR', 2020, src.id, true
from public.species s
join public.sources src on src.url = 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T6553A18493355.en'
where s.slug = 'badak-sumatra';

update public.species set
  indonesia_ecological_status = 'native',
  ecological_source_id = (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T6553A18493355.en' limit 1),
  regulation_status = 'CITES Apendiks I',
  regulation_source_id = (select id from public.sources where url = 'https://cites.org/eng/app/appendices.php' limit 1),
  ecosystem_role = 'Herbivora yang memakan beragam tumbuhan hutan tropis.',
  ecosystem_source_id = coalesce(
    (select ss.source_id from public.species_sources ss
      join public.sources src on src.id = ss.source_id
      join public.species sp on sp.id = ss.species_id
      where sp.slug = 'badak-sumatra' and src.url = 'https://rhinos.org/about-rhinos/rhino-species/sumatran-rhino/' limit 1),
    (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T6553A18493355.en' limit 1)
  )
where slug = 'badak-sumatra';

-- orangutan-sumatra
insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select 'f5054c6f-7cbd-8108-affa-7363ce0bc4f4', 'IUCN Red List of Threatened Species', 'Pongo abelii — IUCN Red List assessment', 'https://doi.org/10.2305/IUCN.UK.2023-1.RLTS.T121097935A247631244.en', null, '2026-11-09', null, 'Source claim: IUCN Red List extinction risk category and assessment year. Year and citation DOI read from the published IUCN assessment record. No population figures imported.'
where not exists (select 1 from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2023-1.RLTS.T121097935A247631244.en');

insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select '629955b3-7bf6-8ca2-a7c8-66807932cd48', 'CITES', 'Appendices I, II and III', 'https://cites.org/eng/app/appendices.php', null, '2026-11-09', null, 'Source claim: listing in CITES Appendix I. Verified from the species taxobox citing cites.org. No trade data imported.'
where not exists (select 1 from public.sources where url = 'https://cites.org/eng/app/appendices.php');

insert into public.species_sources (species_id, source_id, section_key)
select s.id, src.id, v.section_key
from public.species s
cross join (values ('https://doi.org/10.2305/IUCN.UK.2023-1.RLTS.T121097935A247631244.en', 'assessment'), ('https://cites.org/eng/app/appendices.php', 'regulation')) as v(url, section_key)
join public.sources src on src.url = v.url
where s.slug = 'orangutan-sumatra'
on conflict do nothing;

delete from public.conservation_assessments ca
using public.species s
where ca.species_id = s.id and ca.is_current and s.slug = 'orangutan-sumatra';

insert into public.conservation_assessments (id, species_id, status_code, assessment_year, source_id, is_current)
select 'a6f0b279-d79f-866c-af58-4f61752916f0', s.id, 'CR', 2023, src.id, true
from public.species s
join public.sources src on src.url = 'https://doi.org/10.2305/IUCN.UK.2023-1.RLTS.T121097935A247631244.en'
where s.slug = 'orangutan-sumatra';

update public.species set
  indonesia_ecological_status = 'native',
  ecological_source_id = (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2023-1.RLTS.T121097935A247631244.en' limit 1),
  regulation_status = 'CITES Apendiks I',
  regulation_source_id = (select id from public.sources where url = 'https://cites.org/eng/app/appendices.php' limit 1),
  ecosystem_role = 'Pemakan buah dan dedaunan yang hidup di tajuk pohon.',
  ecosystem_source_id = coalesce(
    (select ss.source_id from public.species_sources ss
      join public.sources src on src.id = ss.source_id
      join public.species sp on sp.id = ss.species_id
      where sp.slug = 'orangutan-sumatra' and src.url = 'https://sumatranorangutan.org/orangutans/orangutan-distribution/' limit 1),
    (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2023-1.RLTS.T121097935A247631244.en' limit 1)
  )
where slug = 'orangutan-sumatra';

-- orangutan-kalimantan
insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select '6cdc4a4b-0456-8c68-ab54-d847da46c9e9', 'IUCN Red List of Threatened Species', 'Pongo pygmaeus — IUCN Red List assessment', 'https://doi.org/10.2305/IUCN.UK.2024-1.RLTS.T17975A259043172.en', null, '2026-11-09', null, 'Source claim: IUCN Red List extinction risk category and assessment year. Year and citation DOI read from the published IUCN assessment record. No population figures imported.'
where not exists (select 1 from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2024-1.RLTS.T17975A259043172.en');

insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select '9f7b8dbf-5c49-8996-a35e-078a95b0d2ce', 'CITES', 'Appendices I, II and III', 'https://cites.org/eng/app/appendices.php', null, '2026-11-09', null, 'Source claim: listing in CITES Appendix I. Verified from the species taxobox citing cites.org. No trade data imported.'
where not exists (select 1 from public.sources where url = 'https://cites.org/eng/app/appendices.php');

insert into public.species_sources (species_id, source_id, section_key)
select s.id, src.id, v.section_key
from public.species s
cross join (values ('https://doi.org/10.2305/IUCN.UK.2024-1.RLTS.T17975A259043172.en', 'assessment'), ('https://cites.org/eng/app/appendices.php', 'regulation')) as v(url, section_key)
join public.sources src on src.url = v.url
where s.slug = 'orangutan-kalimantan'
on conflict do nothing;

delete from public.conservation_assessments ca
using public.species s
where ca.species_id = s.id and ca.is_current and s.slug = 'orangutan-kalimantan';

insert into public.conservation_assessments (id, species_id, status_code, assessment_year, source_id, is_current)
select 'a21299f0-d39c-808a-ae05-c706d2e58b06', s.id, 'CR', 2024, src.id, true
from public.species s
join public.sources src on src.url = 'https://doi.org/10.2305/IUCN.UK.2024-1.RLTS.T17975A259043172.en'
where s.slug = 'orangutan-kalimantan';

update public.species set
  indonesia_ecological_status = 'native',
  ecological_source_id = (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2024-1.RLTS.T17975A259043172.en' limit 1),
  regulation_status = 'CITES Apendiks I',
  regulation_source_id = (select id from public.sources where url = 'https://cites.org/eng/app/appendices.php' limit 1),
  ecosystem_role = 'Pemakan buah dan dedaunan yang menyusun sarang di pepohonan.',
  ecosystem_source_id = coalesce(
    (select ss.source_id from public.species_sources ss
      join public.sources src on src.id = ss.source_id
      join public.species sp on sp.id = ss.species_id
      where sp.slug = 'orangutan-kalimantan' and src.url = 'https://www.orangutan.or.id/about-orangutan-habitat' limit 1),
    (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2024-1.RLTS.T17975A259043172.en' limit 1)
  )
where slug = 'orangutan-kalimantan';

-- komodo
insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select '76942d17-ac8d-8d4b-a140-37bc964c3977', 'IUCN Red List of Threatened Species', 'Varanus komodoensis — IUCN Red List assessment', 'https://doi.org/10.2305/IUCN.UK.2021-2.RLTS.T22884A123633058.en', null, '2026-11-09', null, 'Source claim: IUCN Red List extinction risk category and assessment year. Year and citation DOI read from the published IUCN assessment record. No population figures imported.'
where not exists (select 1 from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2021-2.RLTS.T22884A123633058.en');

insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select '13bfdeef-77a2-8a8b-a82f-8913f80b83b0', 'CITES', 'Appendices I, II and III', 'https://cites.org/eng/app/appendices.php', null, '2026-11-09', null, 'Source claim: listing in CITES Appendix I. Verified from the species taxobox citing cites.org. No trade data imported.'
where not exists (select 1 from public.sources where url = 'https://cites.org/eng/app/appendices.php');

insert into public.species_sources (species_id, source_id, section_key)
select s.id, src.id, v.section_key
from public.species s
cross join (values ('https://doi.org/10.2305/IUCN.UK.2021-2.RLTS.T22884A123633058.en', 'assessment'), ('https://cites.org/eng/app/appendices.php', 'regulation')) as v(url, section_key)
join public.sources src on src.url = v.url
where s.slug = 'komodo'
on conflict do nothing;

delete from public.conservation_assessments ca
using public.species s
where ca.species_id = s.id and ca.is_current and s.slug = 'komodo';

insert into public.conservation_assessments (id, species_id, status_code, assessment_year, source_id, is_current)
select '74cbea15-68cd-86d3-aa89-d3777ab7e126', s.id, 'EN', 2021, src.id, true
from public.species s
join public.sources src on src.url = 'https://doi.org/10.2305/IUCN.UK.2021-2.RLTS.T22884A123633058.en'
where s.slug = 'komodo';

update public.species set
  indonesia_ecological_status = 'native',
  ecological_source_id = (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2021-2.RLTS.T22884A123633058.en' limit 1),
  regulation_status = 'CITES Apendiks I',
  regulation_source_id = (select id from public.sources where url = 'https://cites.org/eng/app/appendices.php' limit 1),
  ecosystem_role = 'Predator yang memakan hewan lain dan bangkai.',
  ecosystem_source_id = coalesce(
    (select ss.source_id from public.species_sources ss
      join public.sources src on src.id = ss.source_id
      join public.species sp on sp.id = ss.species_id
      where sp.slug = 'komodo' and src.url = 'https://iucn.org/news/species/202109/tuna-species-recovering-despite-growing-pressures-marine-life-iucn-red-list' limit 1),
    (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2021-2.RLTS.T22884A123633058.en' limit 1)
  )
where slug = 'komodo';

-- anoa-dataran-rendah
insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select '25108a8c-a889-8dfa-a218-60fc1846120a', 'IUCN Red List of Threatened Species', 'Bubalus depressicornis — IUCN Red List assessment', 'https://doi.org/10.2305/IUCN.UK.2016-2.RLTS.T3126A46364222.en', null, '2026-11-09', null, 'Source claim: IUCN Red List extinction risk category and assessment year. Year and citation DOI read from the published IUCN assessment record. No population figures imported.'
where not exists (select 1 from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2016-2.RLTS.T3126A46364222.en');

insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select '04e6254a-b4fa-8be2-aa84-3db13fcda136', 'CITES', 'Appendices I, II and III', 'https://cites.org/eng/app/appendices.php', null, '2026-11-09', null, 'Source claim: listing in CITES Appendix I. Verified from the species taxobox citing cites.org. No trade data imported.'
where not exists (select 1 from public.sources where url = 'https://cites.org/eng/app/appendices.php');

insert into public.species_sources (species_id, source_id, section_key)
select s.id, src.id, v.section_key
from public.species s
cross join (values ('https://doi.org/10.2305/IUCN.UK.2016-2.RLTS.T3126A46364222.en', 'assessment'), ('https://cites.org/eng/app/appendices.php', 'regulation')) as v(url, section_key)
join public.sources src on src.url = v.url
where s.slug = 'anoa-dataran-rendah'
on conflict do nothing;

delete from public.conservation_assessments ca
using public.species s
where ca.species_id = s.id and ca.is_current and s.slug = 'anoa-dataran-rendah';

insert into public.conservation_assessments (id, species_id, status_code, assessment_year, source_id, is_current)
select '7c0a8f70-0209-8d69-aff2-7386539fc586', s.id, 'EN', 2016, src.id, true
from public.species s
join public.sources src on src.url = 'https://doi.org/10.2305/IUCN.UK.2016-2.RLTS.T3126A46364222.en'
where s.slug = 'anoa-dataran-rendah';

update public.species set
  indonesia_ecological_status = 'native',
  ecological_source_id = (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2016-2.RLTS.T3126A46364222.en' limit 1),
  regulation_status = 'CITES Apendiks I',
  regulation_source_id = (select id from public.sources where url = 'https://cites.org/eng/app/appendices.php' limit 1),
  ecosystem_role = 'Herbivora yang memakan tumbuhan dan memanfaatkan hutan sebagai tempat berlindung.',
  ecosystem_source_id = coalesce(
    (select ss.source_id from public.species_sources ss
      join public.sources src on src.id = ss.source_id
      join public.species sp on sp.id = ss.species_id
      where sp.slug = 'anoa-dataran-rendah' and src.url = 'https://bbksdasulsel.ksdae.kehutanan.go.id/identifikasi-tsl-kunci-sulawesi-anoa-lowland' limit 1),
    (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2016-2.RLTS.T3126A46364222.en' limit 1)
  )
where slug = 'anoa-dataran-rendah';

-- jalak-bali
insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select 'fc72306a-4166-8c73-a755-3485b842e1d0', 'IUCN Red List of Threatened Species', 'Leucopsar rothschildi — IUCN Red List assessment', 'https://doi.org/10.2305/IUCN.UK.2021-3.RLTS.T22710912A183006359.en', null, '2026-11-09', null, 'Source claim: IUCN Red List extinction risk category and assessment year. Year and citation DOI read from the published IUCN assessment record. No population figures imported.'
where not exists (select 1 from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2021-3.RLTS.T22710912A183006359.en');

insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select '5b46186a-cc04-8f0d-aaf8-b871600dbc3b', 'CITES', 'Appendices I, II and III', 'https://cites.org/eng/app/appendices.php', null, '2026-11-09', null, 'Source claim: listing in CITES Appendix I. Verified from the species taxobox citing cites.org. No trade data imported.'
where not exists (select 1 from public.sources where url = 'https://cites.org/eng/app/appendices.php');

insert into public.species_sources (species_id, source_id, section_key)
select s.id, src.id, v.section_key
from public.species s
cross join (values ('https://doi.org/10.2305/IUCN.UK.2021-3.RLTS.T22710912A183006359.en', 'assessment'), ('https://cites.org/eng/app/appendices.php', 'regulation')) as v(url, section_key)
join public.sources src on src.url = v.url
where s.slug = 'jalak-bali'
on conflict do nothing;

delete from public.conservation_assessments ca
using public.species s
where ca.species_id = s.id and ca.is_current and s.slug = 'jalak-bali';

insert into public.conservation_assessments (id, species_id, status_code, assessment_year, source_id, is_current)
select '3278ee8e-8bf3-8213-a8bc-7ad31ad602d2', s.id, 'CR', 2021, src.id, true
from public.species s
join public.sources src on src.url = 'https://doi.org/10.2305/IUCN.UK.2021-3.RLTS.T22710912A183006359.en'
where s.slug = 'jalak-bali';

update public.species set
  indonesia_ecological_status = 'native',
  ecological_source_id = (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2021-3.RLTS.T22710912A183006359.en' limit 1),
  regulation_status = 'CITES Apendiks I',
  regulation_source_id = (select id from public.sources where url = 'https://cites.org/eng/app/appendices.php' limit 1),
  ecosystem_role = 'Pemakan buah dan serangga yang bersarang di lubang pohon.',
  ecosystem_source_id = coalesce(
    (select ss.source_id from public.species_sources ss
      join public.sources src on src.id = ss.source_id
      join public.species sp on sp.id = ss.species_id
      where sp.slug = 'jalak-bali' and src.url = 'https://animals.sandiegozoo.org/animals/bali-myna' limit 1),
    (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2021-3.RLTS.T22710912A183006359.en' limit 1)
  )
where slug = 'jalak-bali';

-- babirusa-sulawesi
insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select '3e1096a9-c80b-8350-af37-a3ad209a0de8', 'IUCN Red List of Threatened Species', 'Babyrousa celebensis — IUCN Red List assessment', 'https://doi.org/10.2305/IUCN.UK.2016-1.RLTS.T136446A44142964.en', null, '2026-11-09', null, 'Source claim: IUCN Red List extinction risk category and assessment year. Year and citation DOI read from the published IUCN assessment record. No population figures imported.'
where not exists (select 1 from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2016-1.RLTS.T136446A44142964.en');

insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select '8dbb2da8-5c30-8bc0-aba7-c16cff9bff5d', 'CITES', 'Appendices I, II and III', 'https://cites.org/eng/app/appendices.php', null, '2026-11-09', null, 'Source claim: listing in CITES Appendix I. Verified from the species taxobox citing cites.org. No trade data imported.'
where not exists (select 1 from public.sources where url = 'https://cites.org/eng/app/appendices.php');

insert into public.species_sources (species_id, source_id, section_key)
select s.id, src.id, v.section_key
from public.species s
cross join (values ('https://doi.org/10.2305/IUCN.UK.2016-1.RLTS.T136446A44142964.en', 'assessment'), ('https://cites.org/eng/app/appendices.php', 'regulation')) as v(url, section_key)
join public.sources src on src.url = v.url
where s.slug = 'babirusa-sulawesi'
on conflict do nothing;

delete from public.conservation_assessments ca
using public.species s
where ca.species_id = s.id and ca.is_current and s.slug = 'babirusa-sulawesi';

insert into public.conservation_assessments (id, species_id, status_code, assessment_year, source_id, is_current)
select '27669c78-5b33-8291-ac4e-5ff017229494', s.id, 'VU', 2016, src.id, true
from public.species s
join public.sources src on src.url = 'https://doi.org/10.2305/IUCN.UK.2016-1.RLTS.T136446A44142964.en'
where s.slug = 'babirusa-sulawesi';

update public.species set
  indonesia_ecological_status = 'native',
  ecological_source_id = (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2016-1.RLTS.T136446A44142964.en' limit 1),
  regulation_status = 'CITES Apendiks I',
  regulation_source_id = (select id from public.sources where url = 'https://cites.org/eng/app/appendices.php' limit 1),
  ecosystem_role = 'Pemakan tumbuhan yang hidup di rawa dan hutan sekitar sungai.',
  ecosystem_source_id = coalesce(
    (select ss.source_id from public.species_sources ss
      join public.sources src on src.id = ss.source_id
      join public.species sp on sp.id = ss.species_id
      where sp.slug = 'babirusa-sulawesi' and src.url = 'https://stlzoo.org/animals/mammals/hoofed-mammals/babirusa' limit 1),
    (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2016-1.RLTS.T136446A44142964.en' limit 1)
  )
where slug = 'babirusa-sulawesi';

-- maleo
insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select '5ca7498a-31bc-8757-a451-e9ce95117f8b', 'IUCN Red List of Threatened Species', 'Macrocephalon maleo — IUCN Red List assessment', 'https://doi.org/10.2305/IUCN.UK.2021-3.RLTS.T22678576A194673255.en', null, '2026-11-09', null, 'Source claim: IUCN Red List extinction risk category and assessment year. Year and citation DOI read from the published IUCN assessment record. No population figures imported.'
where not exists (select 1 from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2021-3.RLTS.T22678576A194673255.en');

insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select '646715af-1c86-837f-a44e-131b414ae1c8', 'CITES', 'Appendices I, II and III', 'https://cites.org/eng/app/appendices.php', null, '2026-11-09', null, 'Source claim: listing in CITES Appendix I. Verified from the species taxobox citing cites.org. No trade data imported.'
where not exists (select 1 from public.sources where url = 'https://cites.org/eng/app/appendices.php');

insert into public.species_sources (species_id, source_id, section_key)
select s.id, src.id, v.section_key
from public.species s
cross join (values ('https://doi.org/10.2305/IUCN.UK.2021-3.RLTS.T22678576A194673255.en', 'assessment'), ('https://cites.org/eng/app/appendices.php', 'regulation')) as v(url, section_key)
join public.sources src on src.url = v.url
where s.slug = 'maleo'
on conflict do nothing;

delete from public.conservation_assessments ca
using public.species s
where ca.species_id = s.id and ca.is_current and s.slug = 'maleo';

insert into public.conservation_assessments (id, species_id, status_code, assessment_year, source_id, is_current)
select '4423c256-0da4-8b5d-ab9f-8f321e8dd721', s.id, 'CR', 2021, src.id, true
from public.species s
join public.sources src on src.url = 'https://doi.org/10.2305/IUCN.UK.2021-3.RLTS.T22678576A194673255.en'
where s.slug = 'maleo';

update public.species set
  indonesia_ecological_status = 'native',
  ecological_source_id = (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2021-3.RLTS.T22678576A194673255.en' limit 1),
  regulation_status = 'CITES Apendiks I',
  regulation_source_id = (select id from public.sources where url = 'https://cites.org/eng/app/appendices.php' limit 1),
  ecosystem_role = 'Burung yang mengubur telur di tanah atau pasir yang mendapat panas lingkungan.',
  ecosystem_source_id = coalesce(
    (select ss.source_id from public.species_sources ss
      join public.sources src on src.id = ss.source_id
      join public.species sp on sp.id = ss.species_id
      where sp.slug = 'maleo' and src.url = 'https://programs.wcs.org/press/News-Releases/articleType/ArticleView/articleId/6007/WCS-Helps-Buy-Private-Beach-for-Maleo-Nests.aspx' limit 1),
    (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2021-3.RLTS.T22678576A194673255.en' limit 1)
  )
where slug = 'maleo';

-- siamang
insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select 'a940eff8-f3d1-8722-ae71-0a6c3396f263', 'IUCN Red List of Threatened Species', 'Symphalangus syndactylus — IUCN Red List assessment', 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T39779A17967873.en', null, '2026-11-09', null, 'Source claim: IUCN Red List extinction risk category and assessment year. Year and citation DOI read from the published IUCN assessment record. No population figures imported.'
where not exists (select 1 from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T39779A17967873.en');

insert into public.sources (id, organization, title, url, published_on, accessed_on, license, notes)
select 'fc561035-4b4a-80df-a463-300f55c6f289', 'CITES', 'Appendices I, II and III', 'https://cites.org/eng/app/appendices.php', null, '2026-11-09', null, 'Source claim: listing in CITES Appendix I. Verified from the species taxobox citing cites.org. No trade data imported.'
where not exists (select 1 from public.sources where url = 'https://cites.org/eng/app/appendices.php');

insert into public.species_sources (species_id, source_id, section_key)
select s.id, src.id, v.section_key
from public.species s
cross join (values ('https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T39779A17967873.en', 'assessment'), ('https://cites.org/eng/app/appendices.php', 'regulation')) as v(url, section_key)
join public.sources src on src.url = v.url
where s.slug = 'siamang'
on conflict do nothing;

delete from public.conservation_assessments ca
using public.species s
where ca.species_id = s.id and ca.is_current and s.slug = 'siamang';

insert into public.conservation_assessments (id, species_id, status_code, assessment_year, source_id, is_current)
select 'f84f942f-b42a-8eaf-a9ff-a7477e280e58', s.id, 'EN', 2020, src.id, true
from public.species s
join public.sources src on src.url = 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T39779A17967873.en'
where s.slug = 'siamang';

update public.species set
  indonesia_ecological_status = 'native',
  ecological_source_id = (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T39779A17967873.en' limit 1),
  regulation_status = 'CITES Apendiks I',
  regulation_source_id = (select id from public.sources where url = 'https://cites.org/eng/app/appendices.php' limit 1),
  ecosystem_role = 'Pemakan buah dan daun yang hidup di tajuk hutan tropis.',
  ecosystem_source_id = coalesce(
    (select ss.source_id from public.species_sources ss
      join public.sources src on src.id = ss.source_id
      join public.species sp on sp.id = ss.species_id
      where sp.slug = 'siamang' and src.url = 'https://animals.sandiegozoo.org/animals/siamang' limit 1),
    (select id from public.sources where url = 'https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T39779A17967873.en' limit 1)
  )
where slug = 'siamang';
