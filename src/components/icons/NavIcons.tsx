import React from 'react';
import {
    Home, Building2, Users, FileText, CreditCard, Wrench, ShieldCheck, Settings,
    Plus, Trash2, Edit2, Calendar, Clock, AlertCircle, Filter, ArrowRight,
    TrendingUp, Activity, Bell, BellOff, Sparkles, Database, Image, Receipt,
    MoreVertical, Eye, Phone, Mail, User, Search, MapPin, Car, Box, Upload,
    DollarSign, BedDouble, Ruler, GalleryVertical
} from 'lucide-react';

const baseProps = {
    strokeWidth: 1.5, // Premium thin look
};

// Start Wrapper Component
const IconWrapper = (IconComponent: React.ElementType, props: React.SVGProps<SVGSVGElement>) => (
    <IconComponent {...baseProps} {...props} />
);

export const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Home, props);
export const AssetsIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Building2, props);
export const TenantsIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Users, props);
export const ContractsIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(FileText, props);
export const PaymentsIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(CreditCard, props);
export const ToolsIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Wrench, props);
export const AdminIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(ShieldCheck, props);
export const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Settings, props);
export const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Plus, props);
export const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Trash2, props);
export const EditIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Edit2, props);
export const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Calendar, props);
export const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Clock, props);
export const AlertCircleIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(AlertCircle, props);
export const FilterIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Filter, props);
export const ArrowRightIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(ArrowRight, props);
export const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(TrendingUp, props);
export const ActivityIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Activity, props);
export const BellIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Bell, props);
export const BellOffIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(BellOff, props);
export const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Sparkles, props);
export const WrenchIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Wrench, props); // Duplicate mapping for safety
export const DatabaseIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Database, props);
export const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Image, props);
export const ReceiptIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Receipt, props);
export const MoreVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(MoreVertical, props);
export const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Eye, props);
export const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Phone, props);
export const MailIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Mail, props);
export const UserIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(User, props);
export const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Search, props);
export const MapPinIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(MapPin, props);
export const CarIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Car, props);
export const StorageIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Box, props);
export const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Upload, props);
export const CreditCardIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(CreditCard, props);
export const DollarSignIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(DollarSign, props);
export const BedIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(BedDouble, props);
export const RulerIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(Ruler, props);
export const BalconyIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(GalleryVertical, props);
export const SafeRoomIcon = (props: React.SVGProps<SVGSVGElement>) => IconWrapper(ShieldCheck, props);
