// DOM-owned pages render one shared choice control, never a hidden button copy.
const escapeAttribute=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function workspaceSegmentMarkup({key,label,value,items,disabled=false,className=''}){
 return '<div class="wb-segment-native '+escapeAttribute(className)+'" data-ui-owner="rubber-segment" data-workspace-segment="'+escapeAttribute(key)+'" data-segment-label="'+escapeAttribute(label)+'" data-segment-value="'+escapeAttribute(value)+'" data-segment-items="'+escapeAttribute(JSON.stringify(items))+'" data-segment-disabled="'+disabled+'"></div>';
}
