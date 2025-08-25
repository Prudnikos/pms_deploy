import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, Clock, AlertCircle, User, Plus, Filter, Search } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const priorityColors = {
  'high': 'bg-red-100 text-red-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'low': 'bg-green-100 text-green-800'
};

const statusColors = {
  'pending': 'bg-gray-100 text-gray-800',
  'in_progress': 'bg-blue-100 text-blue-800',
  'completed': 'bg-green-100 text-green-800'
};

export default function Tasks() {
  const { t, currentLanguage } = useTranslation('booking');
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    dueDate: format(new Date(), 'yyyy-MM-dd')
  });

  const dateLocale = currentLanguage === 'ru' ? ru : enUS;

  useEffect(() => {
    // В будущем здесь будет загрузка задач из базы данных
    // Пока что показываем демо-задачи
    const demoTasks = [
      {
        id: '1',
        title: 'Подготовить номер 101 к заезду',
        description: 'Провести генеральную уборку номера после ремонта',
        priority: 'high',
        status: 'pending',
        assignedTo: 'Мария Иванова',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        createdAt: new Date().toISOString()
      },
      {
        id: '2', 
        title: 'Проверить кондиционер в номере 205',
        description: 'Гость жалуется на шум',
        priority: 'medium',
        status: 'in_progress',
        assignedTo: 'Алексей Петров',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        createdAt: new Date().toISOString()
      }
    ];
    setTasks(demoTasks);
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTasks(tasks);
    } else {
      const filtered = tasks.filter(task => {
        const title = task.title?.toLowerCase() || '';
        const description = task.description?.toLowerCase() || '';
        const assignedTo = task.assignedTo?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        
        return title.includes(search) || 
               description.includes(search) || 
               assignedTo.includes(search);
      });
      setFilteredTasks(filtered);
    }
  }, [searchTerm, tasks]);

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    
    const task = {
      id: Date.now().toString(),
      ...newTask,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    setTasks(prev => [...prev, task]);
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      assignedTo: '',
      dueDate: format(new Date(), 'yyyy-MM-dd')
    });
    setShowNewTaskForm(false);
  };

  const handleTaskStatusChange = (taskId, newStatus) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const renderTaskCard = (task) => {
    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
    
    return (
      <Card key={task.id} className={`cursor-pointer hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 mb-1">
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-slate-600 mb-2">
                  {task.description}
                </p>
              )}
            </div>
            
            <div className="flex flex-col gap-2 ml-3">
              <Badge className={priorityColors[task.priority]}>
                {task.priority === 'high' ? 'Высокий' : 
                 task.priority === 'medium' ? 'Средний' : 'Низкий'}
              </Badge>
              
              <Badge className={statusColors[task.status]}>
                {task.status === 'pending' ? 'Ожидает' :
                 task.status === 'in_progress' ? 'В работе' : 'Завершено'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {task.assignedTo && (
              <div className="flex items-center gap-2 text-slate-600">
                <User className="h-3 w-3" />
                <span>Ответственный: {task.assignedTo}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="h-3 w-3" />
              <span>Срок: {format(new Date(task.dueDate), 'dd MMMM yyyy', { locale: dateLocale })}</span>
              {isOverdue && (
                <Badge variant="destructive" className="ml-2">
                  Просрочено
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
            {task.status === 'pending' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTaskStatusChange(task.id, 'in_progress');
                }}
              >
                Начать работу
              </Button>
            )}
            
            {task.status === 'in_progress' && (
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTaskStatusChange(task.id, 'completed');
                }}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                Завершить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Задачи</h1>
          <p className="text-slate-600 mt-1">Управление рабочими задачами</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-base px-3 py-1">
            Всего: {filteredTasks.length}
          </Badge>
          
          <Button onClick={() => setShowNewTaskForm(!showNewTaskForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Новая задача
          </Button>
        </div>
      </div>

      {/* Форма новой задачи */}
      {showNewTaskForm && (
        <Card>
          <CardHeader>
            <CardTitle>Создать новую задачу</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input 
                placeholder="Название задачи"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div>
              <Textarea 
                placeholder="Описание задачи"
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Select value={newTask.priority} onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Приоритет" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Input 
                  placeholder="Ответственный"
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask(prev => ({ ...prev, assignedTo: e.target.value }))}
                />
              </div>
              
              <div>
                <Input 
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleCreateTask}>
                Создать задачу
              </Button>
              <Button variant="outline" onClick={() => setShowNewTaskForm(false)}>
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Поиск по названию, описанию или ответственному..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Список задач */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-slate-600">Загрузка задач...</p>
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTasks.map(renderTaskCard)}
        </div>
      ) : (
        <Card className="p-8">
          <div className="text-center text-slate-500">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold mb-2">Нет задач</h3>
            <p>Создайте первую задачу для команды</p>
          </div>
        </Card>
      )}
    </div>
  );
}