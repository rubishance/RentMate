import React, { useState } from 'react';
import { Checkbox } from '../components/ui/Checkbox';
import { Select } from '../components/ui/Select';
import { MultiSelect } from '../components/ui/MultiSelect';
import { Calendar, User, Mail, CreditCard } from 'lucide-react';
import { DatePicker } from '../components/ui/DatePicker';

export const DesignSystem = () => {
    // Checkbox States
    const [check1, setCheck1] = useState(false);
    const [check2, setCheck2] = useState(true);
    const [check3, setCheck3] = useState(false);

    // Select States
    const [selectValue1, setSelectValue1] = useState('');
    const [selectValue2, setSelectValue2] = useState('option2');

    // MultiSelect States
    const [multiSelectValue, setMultiSelectValue] = useState<string[]>([]);

    // DatePicker States
    const [date1, setDate1] = useState<Date | undefined>(new Date());
    const [date2, setDate2] = useState<Date | undefined>(undefined);

    const options = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2 - Long text example that might truncate' },
        { value: 'option3', label: 'Option 3' },
        { value: 'option4', label: 'Option 4' },
    ];

    const multiOptions = [
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue' },
        { value: 'angular', label: 'Angular' },
        { value: 'svelte', label: 'Svelte' },
        { value: 'nextjs', label: 'Next.js' },
    ];

    return (
        <div className="min-h-screen bg-background p-8 space-y-12">
            <header className="space-y-4">
                <h1 className="text-4xl font-heading font-bold text-foreground">Design System Standards</h1>
                <p className="text-muted-foreground text-lg">Verification of standardized UI components.</p>
            </header>

            {/* Typography Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold border-b pb-2">Typography</h2>
                <div className="space-y-4">
                    <h1 className="text-5xl font-heading">Heading 1 (Outfit)</h1>
                    <h2 className="text-4xl font-heading">Heading 2 (Outfit)</h2>
                    <h3 className="text-3xl font-heading">Heading 3 (Outfit)</h3>
                    <h4 className="text-2xl font-heading">Heading 4 (Outfit)</h4>
                    <p className="font-sans text-base">Body text (Inter). Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                    <p className="font-sans text-sm text-muted-foreground">Small text (Inter). Ut enim ad minim veniam, quis nostrud exercitation ullamco.</p>
                </div>
            </section>

            {/* Colors Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold border-b pb-2">Colors</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-primary text-primary-foreground rounded-xl">Primary</div>
                    <div className="p-4 bg-secondary text-secondary-foreground rounded-xl">Secondary</div>
                    <div className="p-4 bg-destructive text-destructive-foreground rounded-xl">Destructive</div>
                    <div className="p-4 bg-muted text-muted-foreground rounded-xl">Muted</div>
                    <div className="p-4 bg-card text-card-foreground border rounded-xl">Card</div>
                    <div className="p-4 bg-popover text-popover-foreground border rounded-xl">Popover</div>
                </div>
            </section>

            {/* Components Section */}
            <section className="space-y-8">
                <h2 className="text-2xl font-bold border-b pb-2">Components</h2>

                {/* Checkboxes */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Checkboxes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Checkbox
                            checked={check1}
                            onChange={setCheck1}
                            label="Basic Checkbox"
                        />
                        <Checkbox
                            checked={check2}
                            onChange={setCheck2}
                            label="Checked with Description"
                            description="This is a supporting description text."
                        />
                        <Checkbox
                            checked={check3}
                            onChange={setCheck3}
                            label="With Icon"
                            icon={<Calendar className="w-5 h-5" />}
                        />
                        <Checkbox
                            checked={false}
                            onChange={() => { }}
                            label="Disabled Checkbox"
                            disabled
                        />
                        <Checkbox
                            checked={true}
                            onChange={() => { }}
                            label="Disabled Checked"
                            disabled
                        />
                    </div>
                </div>

                {/* Selects */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Selects</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Select
                            label="Basic Select"
                            options={options}
                            value={selectValue1}
                            onChange={setSelectValue1}
                            placeholder="Choose an item..."
                        />
                        <Select
                            label="With Icon & Value"
                            options={options}
                            value={selectValue2}
                            onChange={setSelectValue2}
                            leftIcon={<User className="w-4 h-4" />}
                        />
                        <Select
                            label="Error State"
                            options={options}
                            value=""
                            onChange={() => { }}
                            error="This field is required"
                            required
                        />
                        <Select
                            label="Disabled State"
                            options={options}
                            value={selectValue2}
                            onChange={() => { }}
                            disabled
                        />
                    </div>
                </div>

                {/* MultiSelects */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">MultiSelects</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <MultiSelect
                            label="Technologies"
                            options={multiOptions}
                            selected={multiSelectValue}
                            onChange={setMultiSelectValue}
                            placeholder="Select technologies..."
                        />
                        <MultiSelect
                            label="Technologies (Error)"
                            options={multiOptions}
                            selected={[]}
                            onChange={() => { }}
                            error="Please select at least one"
                        />
                    </div>
                </div>

                {/* Date Pickers */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Date Pickers (Standardized)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <DatePicker
                            label="Default Date Picker"
                            value={date1}
                            onChange={setDate1}
                        />
                        <DatePicker
                            label="With Placeholder"
                            value={date2}
                            onChange={setDate2}
                            placeholder="Select a date..."
                        />
                        <DatePicker
                            label="Disabled/Readonly"
                            value={new Date()}
                            readonly
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

export default DesignSystem;
