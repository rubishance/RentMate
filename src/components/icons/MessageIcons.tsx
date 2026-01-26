import React from 'react';
import { MessageSquare, Copy, Check, X, Loader2, Upload } from 'lucide-react';

const baseProps = {
    strokeWidth: 1.5,
};

const IconWrapper = (IconComponent: React.ElementType, props: React.SVGProps<SVGSVGElement>) => (
    <IconComponent {...baseProps} {...props} />
);

export const MessageIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(MessageSquare, props);
export const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Copy, props);
export const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Check, props);
export const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(X, props);
export const LoaderIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Loader2, props);
export const ShareIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Upload, props);
