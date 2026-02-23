import {z} from "zod"
import { Schema } from "./schema";


export const stage1Schema = Schema.pick({
    task_abstraction: true,
    environment_abstraction: true,
    failure_mode_abstraction: true,
})