-- Скрипт для приведения номеров в порядок в соответствии с Airbnb
-- Обновляем существующие номера и удаляем лишние

-- Сначала получим IDs номеров которые нужно обновить
-- 1. Обновляем номер "101" для Deluxe apartment
UPDATE rooms 
SET room_number = 'Deluxe apartment',
    room_type = 'Deluxe',
    base_price = 100
WHERE room_number = '101';

-- 2. Обновляем номер "201" для Deluxe suite apartment  
UPDATE rooms
SET room_number = 'Deluxe suite apartment', 
    room_type = 'Suite',
    base_price = 200
WHERE room_number = '201';

-- 3. Создаем/обновляем номер для Bungalow 3
-- Используем существующий номер "3 Deluxe with balcony"
UPDATE rooms
SET room_number = 'Bungalow 3',
    room_type = 'Bungalow', 
    base_price = 120
WHERE room_number = '3 Deluxe with balcony';

-- 4. Создаем/обновляем номер для Villa ground floor
-- Используем существующий номер "Люкс"  
UPDATE rooms
SET room_number = 'Villa ground floor',
    room_type = 'Villa',
    base_price = 300
WHERE room_number = 'Люкс';

-- Перемещаем все бронирования из номеров, которые будем удалять
-- в соответствующие новые номера

-- Получаем ID новых номеров для обновления бронирований
WITH room_mappings AS (
  SELECT id as room_id, room_number FROM rooms 
  WHERE room_number IN ('Deluxe apartment', 'Deluxe suite apartment', 'Bungalow 3', 'Villa ground floor')
),
old_rooms AS (
  SELECT id as old_room_id, room_number as old_room_number FROM rooms
  WHERE room_number IN ('1 Down small', '4 Family suite', '5 Deluxe suite', '6 Deluxe 2rooms suite', 'Стандарт')
)

-- Перемещаем бронирования из старых номеров
-- '1 Down small' и 'Стандарт' -> 'Deluxe apartment'
UPDATE bookings 
SET room_id = (SELECT room_id FROM room_mappings WHERE room_number = 'Deluxe apartment')
WHERE room_id IN (
  SELECT old_room_id FROM old_rooms 
  WHERE old_room_number IN ('1 Down small', 'Стандарт')
);

-- '4 Family suite' -> 'Deluxe suite apartment'  
UPDATE bookings
SET room_id = (SELECT room_id FROM room_mappings WHERE room_number = 'Deluxe suite apartment')
WHERE room_id IN (
  SELECT old_room_id FROM old_rooms
  WHERE old_room_number = '4 Family suite' 
);

-- '5 Deluxe suite' -> 'Bungalow 3'
UPDATE bookings
SET room_id = (SELECT room_id FROM room_mappings WHERE room_number = 'Bungalow 3') 
WHERE room_id IN (
  SELECT old_room_id FROM old_rooms
  WHERE old_room_number = '5 Deluxe suite'
);

-- '6 Deluxe 2rooms suite' -> 'Villa ground floor'
UPDATE bookings  
SET room_id = (SELECT room_id FROM room_mappings WHERE room_number = 'Villa ground floor')
WHERE room_id IN (
  SELECT old_room_id FROM old_rooms
  WHERE old_room_number = '6 Deluxe 2rooms suite'
);

-- Удаляем старые номера после перемещения бронирований
DELETE FROM rooms 
WHERE room_number IN (
  '1 Down small', 
  '4 Family suite',
  '5 Deluxe suite', 
  '6 Deluxe 2rooms suite',
  'Стандарт'
);

-- Проверяем результат
SELECT 
  id,
  room_number,
  room_type,
  base_price,
  created_at
FROM rooms 
ORDER BY room_number;