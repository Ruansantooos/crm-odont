'use client';

import { useState, useEffect, useRef } from 'react';

interface Option {
    id: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function SearchableSelect({ options, value, onChange, placeholder = "Selecione...", className }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const selectedOption = options.find(opt => opt.id === value);
        if (selectedOption) {
            setSearch(selectedOption.label);
        } else {
            setSearch("");
        }
    }, [value, options]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Reset search to selected value if closed without selection
                const selectedOption = options.find(opt => opt.id === value);
                setSearch(selectedOption ? selectedOption.label : "");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef, value, options]);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary/20"
                    placeholder={placeholder}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                        if (e.target.value === "") onChange(""); // Clear selection
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                    <span className="material-symbols-outlined text-sm">search</span>
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl max-h-60 overflow-auto border border-gray-100">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <button
                                key={opt.id}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors flex items-center justify-between"
                                onClick={() => {
                                    onChange(opt.id);
                                    setSearch(opt.label);
                                    setIsOpen(false);
                                }}
                            >
                                {opt.label}
                                {value === opt.id && <span className="material-symbols-outlined text-primary text-xs">check</span>}
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-sm text-gray-400">Nenhum resultado encontrado.</div>
                    )}
                </div>
            )}
        </div>
    );
}
