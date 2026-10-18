export const ADDRESS_FIELDS = [
  { key: 'recipient', label: 'Recipient', autoComplete: 'name' },
  { key: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { key: 'country', label: 'Country', autoComplete: 'country-name' },
  { key: 'city', label: 'City', autoComplete: 'address-level2' },
  { key: 'street', label: 'Street and house', autoComplete: 'address-line1' },
  { key: 'apartment', label: 'Apartment', autoComplete: 'address-line2' },
  { key: 'zip', label: 'Postal code', autoComplete: 'postal-code' },
];

/** Multi-line address ready to paste into a shop's checkout. */
export function formatAddress(a) {
  if (!a) return '';
  return [
    a.recipient,
    [a.street, a.apartment].filter(Boolean).join(', '),
    [a.zip, a.city].filter(Boolean).join(' '),
    a.country,
    a.phone,
  ]
    .filter(Boolean)
    .join('\n');
}
