import channexService from './src/services/channex/ChannexService.jsx';

async function checkSuiteRatePlan() {
  console.log('🔍 Проверяем rate plans для Suite номера...\n');
  
  try {
    // Получаем все room types
    const roomTypesResponse = await channexService.apiRequest(
      `/room_types?property_id=${channexService.propertyId}`
    );
    
    const suiteRoomType = roomTypesResponse.data?.find(rt => 
      rt.id === 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3'
    );
    
    if (suiteRoomType) {
      console.log('✅ Найден Suite room type:');
      console.log('  ID:', suiteRoomType.id);
      console.log('  Название:', suiteRoomType.attributes?.title);
      console.log('');
    }
    
    // Получаем все rate plans
    const ratePlansResponse = await channexService.apiRequest(
      `/rate_plans?property_id=${channexService.propertyId}`
    );
    
    console.log('📋 Все доступные rate plans:\n');
    
    for (const ratePlan of ratePlansResponse.data || []) {
      const roomTypeId = ratePlan.relationships?.room_type?.data?.id;
      console.log(`Rate Plan: ${ratePlan.id}`);
      console.log(`  Название: ${ratePlan.attributes?.title}`);
      console.log(`  Room Type ID: ${roomTypeId}`);
      
      if (roomTypeId === 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3') {
        console.log('  ✨ ЭТО RATE PLAN ДЛЯ SUITE!');
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkSuiteRatePlan();