import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

const baseProps = {
    strokeWidth: 1.5,
};

const IconWrapper = (IconComponent: React.ElementType, props: React.SVGProps<SVGSVGElement>) => (
    <IconComponent {...baseProps} {...props} />
);

export const NotificationSuccessIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(CheckCircle, props);
export const NotificationWarningIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(AlertTriangle, props);
export const NotificationErrorIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(XCircle, props);
export const NotificationInfoIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Info, props);
