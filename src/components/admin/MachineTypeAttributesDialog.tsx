// MachineTypeAttributesDialog.tsx

import React, { useState } from 'react';

const MachineTypeAttributesDialog = () => {
    const [attributes, setAttributes] = useState([]);
    const [editingIndex, setEditingIndex] = useState(-1);
    const [newAttribute, setNewAttribute] = useState('');

    const handleCreate = () => {
        setAttributes([...attributes, newAttribute]);
        setNewAttribute('');
    };

    const handleEdit = (index) => {
        setEditingIndex(index);
        setNewAttribute(attributes[index]);
    };

    const handleUpdate = () => {
        const updatedAttributes = [...attributes];
        updatedAttributes[editingIndex] = newAttribute;
        setAttributes(updatedAttributes);
        setEditingIndex(-1);
        setNewAttribute('');
    };

    const handleDelete = (index) => {
        const updatedAttributes = attributes.filter((_, i) => i !== index);
        setAttributes(updatedAttributes);
    };

    const handleCopy = (index) => {
        const attributeToCopy = attributes[index];
        setNewAttribute(attributeToCopy);
    };

    const handlePaste = () => {
        if (newAttribute) {
            setAttributes([...attributes, newAttribute]);
            setNewAttribute('');
        }
    };

    return (
        <div>
            <h2>Machine Type Attributes</h2>
            <input
                type='text'
                value={newAttribute}
                onChange={(e) => setNewAttribute(e.target.value)}
                placeholder='Enter attribute'
            />
            <button onClick={editingIndex === -1 ? handleCreate : handleUpdate}>
                {editingIndex === -1 ? 'Create' : 'Update'}
            </button>
            <button onClick={handlePaste}>Paste</button>
            <ul>
                {attributes.map((attribute, index) => (
                    <li key={index}>
                        {attribute} 
                        <button onClick={() => handleEdit(index)}>Edit</button>
                        <button onClick={() => handleDelete(index)}>Delete</button>
                        <button onClick={() => handleCopy(index)}>Copy</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MachineTypeAttributesDialog;
