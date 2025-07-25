import React, { useState } from 'react';
import { 
  FormField, 
  CampaignForm 
} from '../../types';
import Button from '../ui/Button';
import { 
  Plus, 
  X, 
  PlusCircle, 
  ChevronDown, 
  ChevronUp, 
  GripVertical,
  Type,
  MessageSquare,
  CheckSquare,
  List
} from 'lucide-react';
import Input from '../ui/Input';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface FormBuilderProps {
  initialForm?: CampaignForm;
  campaignId: string;
  onSave: (form: CampaignForm) => void;
}

const FormBuilder: React.FC<FormBuilderProps> = ({
  initialForm,
  campaignId,
  onSave,
}) => {
  // Initialize fields with proper ordering
  const initializeFields = () => {
    if (initialForm?.fields) {
      // Sort by order property and ensure all have correct order values
      const sortedFields = [...initialForm.fields]
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((field, index) => ({
          ...field,
          order: index
        }));
      return sortedFields;
    }
    
    // Default NPS field with Portuguese text
    return [
      {
        id: crypto.randomUUID(),
        type: 'nps' as const,
        label: 'O quanto você recomendaria nosso serviço para um amigo ou colega?',
        required: true,
        order: 0,
      },
    ];
  };

  const [fields, setFields] = useState<FormField[]>(initializeFields());
  const [showFieldOptions, setShowFieldOptions] = useState(false);
  
  const handleAddField = (type: FormField['type']) => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      type,
      label: getDefaultLabel(type),
      required: false,
      options: type === 'select' || type === 'radio' ? ['Opção 1', 'Opção 2'] : undefined,
      order: fields.length,
    };
    
    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    setShowFieldOptions(false);
    
    // Auto-save after adding field
    saveFormWithFields(updatedFields);
  };
  
  const handleRemoveField = (id: string) => {
    const updatedFields = fields.filter(field => field.id !== id);
    // Reorder remaining fields
    const reorderedFields = updatedFields.map((field, index) => ({
      ...field,
      order: index
    }));
    setFields(reorderedFields);
    
    // Auto-save after removing field
    saveFormWithFields(reorderedFields);
  };
  
  const handleFieldChange = (id: string, updates: Partial<FormField>) => {
    const updatedFields = fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    );
    setFields(updatedFields);
    
    // Auto-save field changes
    saveFormWithFields(updatedFields);
  };
  
  const handleOptionAdd = (fieldId: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId && field.options) {
        return {
          ...field,
          options: [...field.options, `Opção ${field.options.length + 1}`],
        };
      }
      return field;
    });
    setFields(updatedFields);
    
    // Auto-save after adding option
    saveFormWithFields(updatedFields);
  };
  
  const handleOptionChange = (fieldId: string, optionIndex: number, value: string) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId && field.options) {
        const newOptions = [...field.options];
        newOptions[optionIndex] = value;
        return { ...field, options: newOptions };
      }
      return field;
    });
    setFields(updatedFields);
    
    // Auto-save after changing option
    saveFormWithFields(updatedFields);
  };
  
  const handleOptionRemove = (fieldId: string, optionIndex: number) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId && field.options) {
        return {
          ...field,
          options: field.options.filter((_, i) => i !== optionIndex),
        };
      }
      return field;
    });
    setFields(updatedFields);
    
    // Auto-save after removing option
    saveFormWithFields(updatedFields);
  };
  
  const saveFormWithFields = async (fieldsToSave: FormField[]) => {
    // Ensure all fields have correct sequential order
    const fieldsWithCorrectOrder = fieldsToSave.map((field, index) => ({
      ...field,
      order: index
    }));
    
    const form: CampaignForm = {
      id: initialForm?.id || crypto.randomUUID(),
      campaignId,
      fields: fieldsWithCorrectOrder,
    };
    
    // Save to Supabase immediately
    try {
      const { saveCampaignForm } = await import('../../utils/supabaseStorage');
      await saveCampaignForm(form);
    } catch (error) {
      console.error('Error saving form:', error);
    }
    
    console.log('Form saved with fields:', fieldsWithCorrectOrder.map(f => ({ id: f.id, label: f.label, order: f.order })));
  };
  
  const handleSave = () => {
    // Final save and navigate
    saveFormWithFields(fields);
    
    const form: CampaignForm = {
      id: initialForm?.id || crypto.randomUUID(),
      campaignId,
      fields: fields.map((field, index) => ({
        ...field,
        order: index
      })),
    };
    
    onSave(form);
  };
  
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    console.log(`Moving field from index ${sourceIndex} to ${destinationIndex}`);
    
    // Create a new array with the reordered fields
    const reorderedFields = Array.from(fields);
    const [movedField] = reorderedFields.splice(sourceIndex, 1);
    reorderedFields.splice(destinationIndex, 0, movedField);
    
    // Update order property for all fields to match their new positions
    const fieldsWithUpdatedOrder = reorderedFields.map((field, index) => ({
      ...field,
      order: index
    }));
    
    console.log('New field order:', fieldsWithUpdatedOrder.map(f => ({ id: f.id, label: f.label, order: f.order })));
    
    // Update the state with the new order
    setFields(fieldsWithUpdatedOrder);
    
    // Defer the save operation to allow react-beautiful-dnd to complete its internal updates
    setTimeout(() => {
      saveFormWithFields(fieldsWithUpdatedOrder);
    }, 0);
  };
  
  const getDefaultLabel = (type: FormField['type']): string => {
    switch (type) {
      case 'nps':
        return 'O quanto você recomendaria nosso serviço para um amigo ou colega?';
      case 'text':
        return 'Por favor, compartilhe seu feedback';
      case 'select':
        return 'Selecione uma opção';
      case 'radio':
        return 'Escolha uma opção';
      default:
        return 'Nova Pergunta';
    }
  };
  
  const getFieldIcon = (type: FormField['type']) => {
    switch (type) {
      case 'nps':
        return <BarChart3 size={16} />;
      case 'text':
        return <MessageSquare size={16} />;
      case 'select':
        return <List size={16} />;
      case 'radio':
        return <CheckSquare size={16} />;
      default:
        return <Type size={16} />;
    }
  };

  const getFieldTypeName = (type: FormField['type']): string => {
    switch (type) {
      case 'nps':
        return 'Pergunta NPS';
      case 'text':
        return 'Pergunta de Texto';
      case 'select':
        return 'Lista Suspensa';
      case 'radio':
        return 'Múltipla Escolha';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Construtor de Formulário</h2>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="form-fields">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-4 mb-6 min-h-[100px] ${
                snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2' : ''
              }`}
            >
              {fields.map((field, index) => (
                <Draggable key={field.id} draggableId={field.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`border rounded-lg p-4 bg-white dark:bg-gray-700 shadow-sm transition-all duration-200 ${
                        snapshot.isDragging 
                          ? 'shadow-lg rotate-2 border-blue-300 dark:border-blue-600' 
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center">
                          <div 
                            {...provided.dragHandleProps} 
                            className="mr-3 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <GripVertical size={20} />
                          </div>
                          <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-3 py-1 rounded-full">
                            {getFieldIcon(field.type)}
                            <span className="ml-2">
                              {getFieldTypeName(field.type)}
                            </span>
                          </div>
                          <span className="ml-3 text-xs text-gray-400 dark:text-gray-500">
                            #{field.order + 1}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) =>
                                handleFieldChange(field.id, { required: e.target.checked })
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 mr-2"
                            />
                            <span className="text-gray-700 dark:text-gray-300">Obrigatório</span>
                          </label>
                          
                          {fields.length > 1 && field.type !== 'nps' && (
                            <button
                              onClick={() => handleRemoveField(field.id)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Remover campo"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Texto da Pergunta
                        </label>
                        <Input
                          value={field.label}
                          onChange={(e) =>
                            handleFieldChange(field.id, { label: e.target.value })
                          }
                          placeholder="Digite sua pergunta"
                          fullWidth
                        />
                      </div>
                      
                      {(field.type === 'select' || field.type === 'radio') && field.options && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Opções</h4>
                          <div className="space-y-2">
                            {field.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-2">
                                <div className="flex-1">
                                  <Input
                                    value={option}
                                    onChange={(e) =>
                                      handleOptionChange(field.id, optionIndex, e.target.value)
                                    }
                                    placeholder={`Opção ${optionIndex + 1}`}
                                    fullWidth
                                  />
                                </div>
                                <button
                                  onClick={() => handleOptionRemove(field.id, optionIndex)}
                                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  disabled={field.options?.length === 1}
                                  title="Remover opção"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<PlusCircle size={14} />}
                            onClick={() => handleOptionAdd(field.id)}
                            className="mt-3 text-sm"
                          >
                            Adicionar Opção
                          </Button>
                        </div>
                      )}
                      
                      {field.type === 'nps' && (
                        <div className="mt-4 bg-gray-50 dark:bg-gray-600 p-4 rounded-lg">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">Pré-visualização:</div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">0</span>
                            <div className="flex-1 flex justify-between mx-4">
                              {Array.from({ length: 11 }, (_, i) => (
                                <div 
                                  key={i} 
                                  className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-full hover:bg-blue-100 dark:hover:bg-blue-800 border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
                                >
                                  {i}
                                </div>
                              ))}
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">10</span>
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>Nada provável</span>
                            <span>Extremamente provável</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      <div className="my-6 relative">
        <Button 
          variant="outline" 
          icon={<Plus size={18} />}
          onClick={() => setShowFieldOptions(!showFieldOptions)}
          className="w-full justify-center"
        >
          Adicionar Pergunta
          <ChevronDown size={16} className={`ml-2 transition-transform ${showFieldOptions ? 'rotate-180' : ''}`} />
        </Button>
        
        {showFieldOptions && (
          <div className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
            <button
              className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
              onClick={() => handleAddField('text')}
            >
              <MessageSquare size={16} className="mr-3 text-gray-500 dark:text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Pergunta de Texto</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Resposta de texto livre</div>
              </div>
            </button>
            <button
              className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
              onClick={() => handleAddField('select')}
            >
              <List size={16} className="mr-3 text-gray-500 dark:text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Lista Suspensa</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Escolha única em lista</div>
              </div>
            </button>
            <button
              className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
              onClick={() => handleAddField('radio')}
            >
              <CheckSquare size={16} className="mr-3 text-gray-500 dark:text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Múltipla Escolha</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Escolha única com botões</div>
              </div>
            </button>
          </div>
        )}
      </div>
      
      <div className="flex justify-end mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button variant="primary" onClick={handleSave} className="px-8">
          Salvar Formulário
        </Button>
      </div>
    </div>
  );
};

const BarChart3: React.FC<{ size: number }> = ({ size }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

export default FormBuilder;