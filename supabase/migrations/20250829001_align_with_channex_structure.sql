-- Приведение структуры номеров в соответствие с Channex
-- Оставляем только 3 типа: Standard Room, Deluxe Room, Suite
-- IDs из Channex: Standard (8df610ce-cabb-429d-98d0-90c33f451d97), Deluxe (734d5d86-1fe6-44d8-b6c5-4ac9349c4410), Suite (e243d5aa-eff3-43a7-8bf8-87352b62fdc3)

-- Сначала проверяем существующие номера
-- SELECT room_number, room_type FROM rooms ORDER BY room_number;

-- 1. Обновляем существующие номера под структуру Channex
-- Standard Room (базовая цена $100)
UPDATE rooms 
SET room_number = 'Standard Room',
    room_type = 'Standard'
WHERE room_number IN ('Deluxe apartment', '101', 'Стандарт', '1 Down small');

-- Deluxe Room (базовая цена $200)  
UPDATE rooms
SET room_number = 'Deluxe Room',
    room_type = 'Deluxe'
WHERE room_number IN ('Deluxe suite apartment', '201', '4 Family suite', '5 Deluxe suite');

-- Suite (базовая цена $300)
UPDATE rooms
SET room_number = 'Suite', 
    room_type = 'Suite'
WHERE room_number IN ('Villa ground floor', 'Bungalow 3', '6 Deluxe 2rooms suite', 'Люкс');

-- Обновляем booking записи для Standard Room
UPDATE bookings 
SET room_id = (SELECT id FROM rooms WHERE room_number = 'Standard Room' LIMIT 1)
WHERE room_id IN (
  SELECT id FROM rooms 
  WHERE room_number IN ('Deluxe apartment', '101', 'Стандарт', '1 Down small')
);

-- Обновляем booking записи для Deluxe Room
UPDATE bookings
SET room_id = (SELECT id FROM rooms WHERE room_number = 'Deluxe Room' LIMIT 1) 
WHERE room_id IN (
  SELECT id FROM rooms
  WHERE room_number IN ('Deluxe suite apartment', '201', '4 Family suite', '5 Deluxe suite')
);

-- Обновляем booking записи для Suite
UPDATE bookings
SET room_id = (SELECT id FROM rooms WHERE room_number = 'Suite' LIMIT 1)
WHERE room_id IN (
  SELECT id FROM rooms
  WHERE room_number IN ('Villa ground floor', 'Bungalow 3', '6 Deluxe 2rooms suite', 'Люкс')
);

-- Удаляем дублирующие номера, оставляем только по одному каждого типа
DELETE FROM rooms 
WHERE id NOT IN (
  SELECT DISTINCT ON (room_number) id 
  FROM rooms 
  WHERE room_number IN ('Standard Room', 'Deluxe Room', 'Suite')
  ORDER BY room_number, created_at
);

-- Проверяем итоговую структуру
SELECT room_number, room_type, COUNT(*) as count 
FROM rooms 
GROUP BY room_number, room_type 
ORDER BY room_number;