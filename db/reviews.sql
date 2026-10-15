-- The reviews table. NOT applied to the live database until the owner says so.
-- Same security model as `purchases`: Row Level Security on, no public policies, nothing granted to the public roles.
-- Only the server (with the secret service key) can read or write it.
--
-- Two kinds of rows, both from real submissions only:
--   free_feedback      from the free result: "Was your score accurate?" (thumbs) and the site's star popup
--   verified_purchase  from a buyer, after their plan is delivered; tied to the payment reference, one per purchase
--
-- Nothing personal is stored beyond what the person typed and agreed to show: no email, no IP, no user agent.
-- display_name and country are kept ONLY when consent_display is true (the server drops them otherwise).

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('free_feedback', 'verified_purchase')),
  major_slug text,
  accurate boolean,                       -- the thumbs: true = "yes, accurate"
  rating smallint check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 300),
  consent_display boolean not null default false,
  display_name text check (display_name is null or char_length(display_name) <= 24),
  country text check (country is null or char_length(country) = 2),
  purchase_reference text,                -- the payment reference behind a verified review
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  -- a verified review always carries a rating and a payment reference; a free one carries a thumb or a rating
  constraint reviews_shape check (
    (kind = 'verified_purchase' and rating is not null and purchase_reference is not null)
    or (kind = 'free_feedback' and (accurate is not null or rating is not null))
  ),
  -- name and country are only kept with consent
  constraint reviews_consent check (consent_display or (display_name is null and country is null))
);

-- one review per purchase
create unique index if not exists reviews_one_per_purchase on public.reviews (purchase_reference) where purchase_reference is not null;
create index if not exists reviews_public_idx on public.reviews (status, kind, created_at desc);

alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
