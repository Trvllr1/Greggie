-- =============================================
-- Relay Transcript Seed Data
-- Populates relay_entries for the "Beauty Lab" relay channel
-- Channel ID: 10000000-0000-0000-0000-000000000005
-- =============================================

INSERT INTO relay_entries (channel_id, transcript_chunk, timestamp_sec) VALUES
    -- Intro segment (0:00 - 2:00)
    ('10000000-0000-0000-0000-000000000005', 'Hey everyone, welcome back to Beauty Lab! Today we are doing live swatches of the new titanium collection from Glow Cosmetics.', 15),
    ('10000000-0000-0000-0000-000000000005', 'If you''re new here, I test every single product on stream so you can see the real colors and textures before you buy.', 35),
    ('10000000-0000-0000-0000-000000000005', 'Let me start with the packaging. It comes in this gorgeous recyclable glass jar with a magnetic lid. Very premium feel.', 60),

    -- Foundation segment (2:00 - 5:00)
    ('10000000-0000-0000-0000-000000000005', 'First up, the titanium foundation. This is a medium to full coverage formula and it has SPF 30 built in.', 134),
    ('10000000-0000-0000-0000-000000000005', 'I''m applying it with a damp beauty sponge. You can see how smoothly it blends. No streaking at all.', 165),
    ('10000000-0000-0000-0000-000000000005', 'The shade range is incredible — 42 shades. I''m wearing shade 27 Caramel. Let me hold it up to the camera.', 195),
    ('10000000-0000-0000-0000-000000000005', 'Someone asked about the ingredients. It''s vegan, cruelty-free, and the titanium dioxide is pharmaceutical grade.', 230),
    ('10000000-0000-0000-0000-000000000005', 'For oily skin types, this foundation is amazing. It has a natural matte finish without looking cakey.', 270),

    -- Lipstick segment (5:00 - 8:00)
    ('10000000-0000-0000-0000-000000000005', 'Now let''s move on to the lip products. These titanium lip stains are absolutely stunning.', 310),
    ('10000000-0000-0000-0000-000000000005', 'This shade is called Ruby Titanium. It''s a deep red with a slight metallic shimmer. Look at that pigment!', 340),
    ('10000000-0000-0000-0000-000000000005', 'The formula is transfer-proof. I''m going to do the coffee cup test right now live. See? Nothing on the cup.', 380),
    ('10000000-0000-0000-0000-000000000005', 'For those asking about the price, the lip stain is twenty-eight dollars and the foundation is forty-two dollars.', 420),
    ('10000000-0000-0000-0000-000000000005', 'We have a bundle deal today — buy the foundation and any lip product together for sixty dollars total. That saves you ten dollars.', 450),

    -- Skincare segment (8:00 - 11:00)
    ('10000000-0000-0000-0000-000000000005', 'Quick skincare break! Before any makeup, I always use the hyaluronic acid serum. This one is from their skincare line.', 490),
    ('10000000-0000-0000-0000-000000000005', 'It has niacinamide and vitamin C. Great for dark spots and evening out your skin tone. I''ve been using it for three weeks.', 525),
    ('10000000-0000-0000-0000-000000000005', 'The texture is like water — super lightweight. Absorbs in about thirty seconds. No sticky feeling at all.', 560),
    ('10000000-0000-0000-0000-000000000005', 'For sensitive skin, they have a fragrance-free version. Same formula, just without the essential oils.', 590),

    -- Eye products segment (11:00 - 14:00)
    ('10000000-0000-0000-0000-000000000005', 'Okay moving on to eyes! The titanium eyeshadow palette has twelve shades — six mattes and six shimmers.', 670),
    ('10000000-0000-0000-0000-000000000005', 'The shimmer shades have actual micro-fine titanium particles. That''s what gives them this incredible reflective quality.', 710),
    ('10000000-0000-0000-0000-000000000005', 'I''m going to do a quick eye look. Starting with the matte brown in the crease, then layering the gold shimmer on the lid.', 745),
    ('10000000-0000-0000-0000-000000000005', 'No primer needed with these shadows. They''re formulated to last twelve hours without creasing. Waterproof too.', 790),
    ('10000000-0000-0000-0000-000000000005', 'The palette retails for fifty-five dollars but we have it at thirty-nine ninety-nine today only. Use code BEAUTYLIVE.', 830),

    -- Q&A segment (14:00 - 17:00)
    ('10000000-0000-0000-0000-000000000005', 'Time for your questions! Someone asked if these products are safe for eczema-prone skin. Let me check the ingredient list.', 850),
    ('10000000-0000-0000-0000-000000000005', 'Yes, the foundation and serum are dermatologist tested. They avoid common irritants like parabens and sulfates.', 890),
    ('10000000-0000-0000-0000-000000000005', 'Great question about shipping — everything ships free over thirty-five dollars and arrives in two to three business days.', 930),
    ('10000000-0000-0000-0000-000000000005', 'Can you use the foundation as concealer? Absolutely. The coverage is buildable. Just tap a little extra under the eyes.', 970),
    ('10000000-0000-0000-0000-000000000005', 'For the best results, set everything with a translucent powder. Glow Cosmetics makes one but any brand works.', 1010),

    -- Closing segment (17:00 - 19:00)
    ('10000000-0000-0000-0000-000000000005', 'Let me do a final look at everything we covered today. Foundation, lip stain, serum, and the eyeshadow palette.', 1050),
    ('10000000-0000-0000-0000-000000000005', 'Remember the bundle deal — foundation plus any lip product for sixty dollars. And the palette is thirty-nine ninety-nine with code BEAUTYLIVE.', 1090),
    ('10000000-0000-0000-0000-000000000005', 'Thank you all for watching! This stream will be available as a relay so you can rewatch anytime. See you tomorrow at 7 PM!', 1130);
