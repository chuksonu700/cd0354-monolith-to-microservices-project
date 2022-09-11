import { v4 as uuidv4 } from 'uuid';

export const genID=()=>{
    let pid = uuidv4();
    return pid;
};