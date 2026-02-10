import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { DndContext, useDndMonitor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '../../supabaseClient'; // Adjust the import based on your project structure

const MachineTypeAttributesManager = () => {
  const { control, handleSubmit, reset } = useForm();
  const [attributes, setAttributes] = useState([]);

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    const { data, error } = await supabase 
      .from('attributes') // Adjust for your table name
      .select('*');
    if (error) console.error('Error fetching attributes:', error);
    else setAttributes(data);
  };

  const onSubmit = async (data) => {
    const { name, id } = data;
    if (id) {
      // Update existing attribute
      const { error } = await supabase
        .from('attributes')
        .update({ name })
        .match({ id });
      if (error) console.error('Error updating attribute:', error);
    } else {
      // Create new attribute
      const { error } = await supabase
        .from('attributes')
        .insert({ name });
      if (error) console.error('Error creating attribute:', error);
    }
    reset();
    fetchAttributes();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from('attributes')
      .delete()
      .match({ id });
    if (error) console.error('Error deleting attribute:', error);
    fetchAttributes();
  };

  const handleDragEnd = ({ active, over }) => {
    if (over) {
      const oldIndex = attributes.findIndex(attr => attr.id === active.id);
      const newIndex = attributes.findIndex(attr => attr.id === over.id);
      const newAttributes = arrayMove(attributes, oldIndex, newIndex);
      setAttributes(newAttributes);
      // Optionally, you can save the new order to Supabase here
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
            {attr.name}
            <button onClick={() => handleDelete(attr.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </DndContext>
  );
};
export default MachineTypeAttributesManager;
