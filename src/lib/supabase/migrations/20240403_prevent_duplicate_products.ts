-- Instead of deleting, set duplicates to inactive
-- This keeps your past sales history perfectly safe!
UPDATE public.products p
SET is_active = false
WHERE ctid NOT IN (
    SELECT min(ctid) 
    FROM public.products 
    WHERE is_active = true
    GROUP BY organization_id, name
);

-- Create a Partial Unique Index
-- This guarantees no NEW duplicates can be created going forward,
-- but allows inactive historical records to exist without crashing your database.
CREATE UNIQUE INDEX IF NOT EXISTS products_active_org_name_unique 
ON public.products (organization_id, name) 
WHERE is_active = true;