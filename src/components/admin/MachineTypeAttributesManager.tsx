import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { sortableKeyboardCoordinates, SortableContext, arrayMove } from '@dnd-kit/sortable';

const MachineTypeAttributesManager = () => {
    const [attributes, setAttributes] = useState<string[]>(['Attribute 1', 'Attribute 2']);

    const handleCreate = () => {
        setAttributes([...attributes, `Attribute ${attributes.length + 1}`]);
    };

    const handleEdit = (index: number, newValue: string) => {
        const updatedAttributes = [...attributes];
        updatedAttributes[index] = newValue;
        setAttributes(updatedAttributes);
    };

    const handleDelete = (index: number) => {
        setAttributes(attributes.filter((_, i) => i !== index));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setAttributes((attrs) => {
                const oldIndex = attrs.indexOf(active.id);
                const newIndex = attrs.indexOf(over.id);
                return arrayMove(attrs, oldIndex, newIndex);
            });
        }
    };

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <SortableContext items={attributes}>
                {attributes.map((attribute, index) => (
                    <div key={attribute}>
                        {/* Replace this with a sortable component */}
                        <div>{attribute}</div>
                        <button onClick={() => handleEdit(index, prompt('Edit attribute:', attribute) || attribute)}>Edit</button>
                        <button onClick={() => handleDelete(index)}>Delete</button>
                    </div>
                ))}
            </SortableContext>
            <button onClick={handleCreate}>Add Attribute</button>
        </DndContext>
    );
};

export default MachineTypeAttributesManager;
