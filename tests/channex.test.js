// tests/channex.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import ChannexSyncManager from '../src/components/ChannexSyncManager';

// Мокаем зависимости
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: null })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 1 }, error: null })
        })
      }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null })
      })
    })
  }
}));

vi.mock('../src/services/channex/ChannexService', () => ({
  default: {
    getProperties: () => Promise.resolve({ data: [] }),
    syncRooms: () => Promise.resolve({ synced: 5, errors: 0 }),
    useMockData: true
  }
}));

describe('ChannexSyncManager', () => {
  test('отображает статус подключения', async () => {
    render(<ChannexSyncManager />);
    
    // Ждем загрузки компонента
    await waitFor(() => {
      expect(screen.getByText(/Подключено|Не подключено/)).toBeInTheDocument();
    });
  });

  test('отображает кнопку синхронизации', () => {
    render(<ChannexSyncManager />);
    
    const syncButton = screen.getByText('Синхронизировать');
    expect(syncButton).toBeInTheDocument();
  });

  test('показывает статистику', () => {
    render(<ChannexSyncManager />);
    
    expect(screen.getByText('Объекты')).toBeInTheDocument();
    expect(screen.getByText('Комнаты')).toBeInTheDocument();
    expect(screen.getByText('Бронирования')).toBeInTheDocument();
  });

  test('переключает табы', () => {
    render(<ChannexSyncManager />);
    
    const logsTab = screen.getByText('Логи');
    fireEvent.click(logsTab);
    
    expect(screen.getByText('История синхронизации')).toBeInTheDocument();
  });
});