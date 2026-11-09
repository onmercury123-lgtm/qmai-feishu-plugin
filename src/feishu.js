import {bitable} from '@lark-base-open/js-sdk';
import {readSelection} from './reader.js';
export const readSelectedBatch=()=>readSelection(bitable.base);
export const readSelected=async recordId=>(await readSelection(bitable.base,recordId))[0];
export function watchSelection(callback){return bitable.base.onSelectionChange(callback);}
export async function watchRecord(tableId,callback){const table=await bitable.base.getTableById(tableId);return table.onRecordModify(callback);}

import {writeExecutionStatus} from './writeback.js';
export const writeStatus=(source,action)=>writeExecutionStatus(bitable.base,source,action);

export const readOriginal=async source=>(await readSelection(bitable.base,source.recordId,source))[0];
