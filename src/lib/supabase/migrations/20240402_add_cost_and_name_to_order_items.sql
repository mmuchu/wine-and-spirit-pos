-- Add the new columns
ALTER TABLE public.order_items 
ADD COLUMN name text,
ADD COLUMN cost_price numeric(10, 2);

-- (Optional) Update your function to actually use them
CREATE OR REPLACE FUNCTION public.process_pos_sale(
    -- ... same parameters as before ...
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$ DECLARE
    v_order_id uuid;
    v_total numeric;
BEGIN
    -- ... step 1 and 2 are the same ...

    -- 3. Insert Order Items (Now including name and cost_price!)
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, name, cost_price)
    SELECT 
        v_order_id,
        (item->>'id')::uuid,           
        (item->>'quantity')::int,
        (item->>'price')::numeric,
        item->>'name',                 -- <--- New
        (item->>'cost_price')::numeric -- <--- New
    FROM jsonb_array_elements(p_items_json) AS item;

    -- ... step 4 and 5 are the same ...
END;
 $$;