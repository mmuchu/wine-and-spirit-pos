CREATE OR REPLACE FUNCTION public.process_pos_sale(
    p_org_id uuid,
    p_user_id uuid,
    p_shift_id uuid,
    p_items_json jsonb,
    p_items jsonb,
    p_payment_method text,
    p_tax_amount numeric,
    p_subtotal numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$ DECLARE
    v_order_id uuid;
    v_total numeric;
BEGIN
    -- 1. Calculate Total
    SELECT SUM((item->>'price')::numeric * (item->>'quantity')::int) + p_tax_amount 
    INTO v_total
    FROM jsonb_array_elements(p_items_json) AS item;

    -- 2. Create the Order (Exact match to your orders table)
    WITH new_order AS (
        INSERT INTO orders (organization_id, staff_id, total, status, created_at)
        VALUES (p_org_id, NULL, v_total, 'completed', now())
        RETURNING id
    )
    SELECT id INTO v_order_id FROM new_order;

    -- 3. Insert Order Items (Exact match to your order_items table)
    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    SELECT 
        v_order_id,
        (item->>'id')::uuid,           
        (item->>'quantity')::int,
        (item->>'price')::numeric
    FROM jsonb_array_elements(p_items_json) AS item;

    -- 4. Deduct Stock from Products
    UPDATE products p
    SET stock = p.stock - (item->>'quantity')::int
    FROM jsonb_array_elements(p_items) AS item
    WHERE p.id = (item->>'product_id')::uuid; 

    -- 5. Return success
    RETURN json_build_object(
        'success', true,
        'sale_id', v_order_id,
        'total', v_total
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
 $$;