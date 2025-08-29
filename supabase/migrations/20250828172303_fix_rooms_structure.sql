-- !:@8?B 4;O ?@82545=8O =><5@>2 2 ?>@O4>: 2 A>>B25BAB288 A Airbnb
-- 1=>2;O5< ACI5AB2CNI85 =><5@0 8 C40;O5< ;8H=85

-- !=0G0;0 ?>;CG8< IDs =><5@>2 :>B>@K5 =C6=> >1=>28BL
-- 1. 1=>2;O5< =><5@ "101" 4;O Deluxe apartment
UPDATE rooms 
SET room_number = 'Deluxe apartment',
    room_type = 'Deluxe',
    base_price = 100
WHERE room_number = '101';

-- 2. 1=>2;O5< =><5@ "201" 4;O Deluxe suite apartment  
UPDATE rooms
SET room_number = 'Deluxe suite apartment', 
    room_type = 'Suite',
    base_price = 200
WHERE room_number = '201';

-- 3. !>7405</>1=>2;O5< =><5@ 4;O Bungalow 3
-- A?>;L7C5< ACI5AB2CNI89 =><5@ "3 Deluxe with balcony"
UPDATE rooms
SET room_number = 'Bungalow 3',
    room_type = 'Bungalow', 
    base_price = 120
WHERE room_number = '3 Deluxe with balcony';

-- 4. !>7405</>1=>2;O5< =><5@ 4;O Villa ground floor
-- A?>;L7C5< ACI5AB2CNI89 =><5@ "N:A"  
UPDATE rooms
SET room_number = 'Villa ground floor',
    room_type = 'Villa',
    base_price = 300
WHERE room_number = 'N:A';

-- 5@5<5I05< 2A5 1@>=8@>20=8O 87 =><5@>2, :>B>@K5 1C45< C40;OBL
-- 2 A>>B25BAB2CNI85 =>2K5 =><5@0

-- 5@5<5I05< 1@>=8@>20=8O 87 AB0@KE =><5@>2
-- '1 Down small' 8 '!B0=40@B' -> 'Deluxe apartment'
UPDATE bookings 
SET room_id = (
  SELECT id FROM rooms WHERE room_number = 'Deluxe apartment' LIMIT 1
)
WHERE room_id IN (
  SELECT id FROM rooms 
  WHERE room_number IN ('1 Down small', '!B0=40@B')
);

-- '4 Family suite' -> 'Deluxe suite apartment'  
UPDATE bookings
SET room_id = (
  SELECT id FROM rooms WHERE room_number = 'Deluxe suite apartment' LIMIT 1
)
WHERE room_id IN (
  SELECT id FROM rooms
  WHERE room_number = '4 Family suite' 
);

-- '5 Deluxe suite' -> 'Bungalow 3'
UPDATE bookings
SET room_id = (
  SELECT id FROM rooms WHERE room_number = 'Bungalow 3' LIMIT 1
) 
WHERE room_id IN (
  SELECT id FROM rooms
  WHERE room_number = '5 Deluxe suite'
);

-- '6 Deluxe 2rooms suite' -> 'Villa ground floor'
UPDATE bookings  
SET room_id = (
  SELECT id FROM rooms WHERE room_number = 'Villa ground floor' LIMIT 1
)
WHERE room_id IN (
  SELECT id FROM rooms
  WHERE room_number = '6 Deluxe 2rooms suite'
);

-- #40;O5< AB0@K5 =><5@0 ?>A;5 ?5@5<5I5=8O 1@>=8@>20=89
DELETE FROM rooms 
WHERE room_number IN (
  '1 Down small', 
  '4 Family suite',
  '5 Deluxe suite', 
  '6 Deluxe 2rooms suite',
  '!B0=40@B'
);