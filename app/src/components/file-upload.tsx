import React, { useState, useRef } from 'react';
import { Tooltip, UnstyledButton, Group, Text } from '@mantine/core';
import { IconPaperclip } from '@tabler/icons-react';
import { Button } from '@mantine/core';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      //setIsUploading(true);
      onFileSelected(file);
      event.target.value = '';
    }
  };

  return (
    <div>
        <input
          ref={ fileInputRef }
          id="file-upload"
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <Button variant="subtle" size="xs" compact leftIcon={<IconPaperclip/>} onClick={ () => { fileInputRef.current?.click() }}></Button>
    </div>    
  );
};

export default FileUpload;

export async function computeSHA1(file: File): Promise<string> {
  // Step 1: Read the file as an ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Step 2: Compute the SHA-1 hash
  const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);

  // Step 3: Convert the hash to a hexadecimal string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}