import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';

interface AttributeDefinition {
  id: string;
  attribute_name: string;
  attribute_type: string;
  options: any;
  is_required: boolean;
  sequence_order: number;
  template_id: string | null;
}

interface FormData {
  name: string;
  id?: string;
}

const MachineTypeAttributesManager = () => {
  const { control, handleSubmit, reset } = useForm<FormData>();
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    const { data, error } = await supabase
      .from('section_attribute_definitions')
      .select('*');
    if (error) console.error('Error fetching attributes:', error);
    else setAttributes(data as AttributeDefinition[]);
  };

  const onSubmit = async (data: FormData) => {
    const { name, id } = data;
    if (id) {
      const { error } = await supabase
        .from('section_attribute_definitions')
        .update({ attribute_name: name })
        .eq('id', id);
      if (error) console.error('Error updating attribute:', error);
    } else {
      const { error } = await supabase
        .from('section_attribute_definitions')
        .insert({ attribute_name: name, attribute_type: 'text' });
      if (error) console.error('Error creating attribute:', error);
    }
    reset();
    fetchAttributes();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('section_attribute_definitions')
      .delete()
      .eq('id', id);
    if (error) console.error('Error deleting attribute:', error);
    fetchAttributes();
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) {
      const oldIndex = attributes.findIndex(attr => attr.id === active.id);
      const newIndex = attributes.findIndex(attr => attr.id === over.id);
      const newAttributes = arrayMove(attributes, oldIndex, newIndex);
      setAttributes(newAttributes);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="name"
          control={control}
          defaultValue=""
          render={({ field }) => <input placeholder="Attribute Name" {...field} />}
        />
        <button type="submit">Submit</button>
      </form>
      <ul>
        {attributes.map((attr) => (
          <li key={attr.id} id={attr.id}>
            {attr.attribute_name}
            <button onClick={() => handleDelete(attr.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </DndContext>
  );
};
export default MachineTypeAttributesManager;
