import { IsString, Length, Matches, ValidateIf, IsEmail, IsUUID, IsIn, IsInt, Min, Max, IsBoolean, IsISO8601 } from 'class-validator';
const supplied = (_: unknown, value: unknown) => value !== undefined && value !== null;
export class ContactInput {
  @IsString() @Length(1,120) @Matches(/\S/) name!: string;
  @ValidateIf(supplied) @IsString() @Matches(/^\+[1-9][0-9]{7,14}$/) phone?: string | null;
  @ValidateIf(supplied) @IsEmail() @Length(3,254) email?: string | null;
}
export class OpportunityInput {
  @IsString() @Length(1,160) @Matches(/\S/) title!: string;
  @ValidateIf(supplied) @IsUUID() contactId?: string | null;
  @IsIn(['new','conversation','proposal','won','lost']) stage!: string;
  @ValidateIf(supplied) @IsInt() @Min(0) @Max(9000000000000) amountCents?: number | null;
}
export class TaskInput {
  @IsString() @Length(1,160) @Matches(/\S/) title!: string;
  @ValidateIf(supplied) @IsUUID() contactId?: string | null;
  @ValidateIf(supplied) @IsUUID() opportunityId?: string | null;
  @ValidateIf(supplied) @IsISO8601({strict:true}) @Matches(/(Z|[+-]\d{2}:\d{2})$/) dueAt?: string | null;
  @ValidateIf((_o,v) => v !== undefined) @IsBoolean() completed?: boolean;
}
export class KnowledgeInput {
  @IsString() @Length(1,160) @Matches(/\S/) title!: string;
  @IsString() @Length(1,12000) @Matches(/\S/) content!: string;
}
export class WorkflowInput {
  @IsString() @Length(1,120) @Matches(/\S/) name!: string;
  @IsIn(['opportunity.won','task.created']) trigger!: string;
  @IsString() @Length(1,160) @Matches(/\S/) taskTitle!: string;
}
