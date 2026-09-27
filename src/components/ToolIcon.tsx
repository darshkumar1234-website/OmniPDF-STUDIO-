import React from 'react';
import {
  Layers,
  Scissors,
  Grid3X3,
  Hash,
  Minimize2,
  Image,
  FileImage,
  FileText,
  PenTool,
  ScanText,
  MessageSquareText,
  Sparkles,
  ShieldAlert,
  Table,
  Languages,
  GraduationCap,
  FileSignature,
} from 'lucide-react';

interface ToolIconProps {
  name: string;
  className?: string;
}

export const ToolIcon: React.FC<ToolIconProps> = ({ name, className = 'w-5 h-5' }) => {
  switch (name) {
    case 'Layers':
      return <Layers className={className} />;
    case 'Scissors':
      return <Scissors className={className} />;
    case 'Grid3X3':
      return <Grid3X3 className={className} />;
    case 'Hash':
      return <Hash className={className} />;
    case 'Minimize2':
      return <Minimize2 className={className} />;
    case 'Image':
      return <Image className={className} />;
    case 'FileImage':
      return <FileImage className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'PenTool':
      return <PenTool className={className} />;
    case 'Signature':
      return <FileSignature className={className} />;
    case 'ScanText':
      return <ScanText className={className} />;
    case 'MessageSquareText':
      return <MessageSquareText className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'ShieldAlert':
      return <ShieldAlert className={className} />;
    case 'Table':
      return <Table className={className} />;
    case 'Languages':
      return <Languages className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    default:
      return <FileText className={className} />;
  }
};
