export interface ScannedFieldData {
    value: string | number | boolean | null;
    quote: string;
}

export interface ScannedContractData {
    property?: ScannedFieldData;
    tenantName?: ScannedFieldData;
    tenantID?: ScannedFieldData;
    tenantEmail?: ScannedFieldData;
    tenantPhone?: ScannedFieldData;
    amount?: ScannedFieldData;
    currency?: ScannedFieldData;
    freq?: ScannedFieldData;
    start?: ScannedFieldData;
    end?: ScannedFieldData;
    linkageType?: ScannedFieldData;
    baseIndexDate?: ScannedFieldData;
    parking?: ScannedFieldData;
    storage?: ScannedFieldData;
    painting?: ScannedFieldData;
    furniture?: ScannedFieldData;
    paymentMethod?: ScannedFieldData;
    guarantees?: ScannedFieldData;
    renewals?: ScannedFieldData;
    comments?: ScannedFieldData;
}
