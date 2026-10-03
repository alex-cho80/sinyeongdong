// Identity headers are set by Sites dispatch, never by browser form fields.
export function accessFor(headers:Headers,adminEmail:string|undefined){
 const id=headers.get('oai-authenticated-user-id')?.trim();
 const email=headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
 const owner=adminEmail?.trim().toLowerCase();
 return {authenticated:!!id&&!!email,canEdit:!!id&&!!email&&!!owner&&email===owner};
}
