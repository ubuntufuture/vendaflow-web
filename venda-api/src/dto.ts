import {
  IsBoolean,
  IsIn,
  ValidateIf,
  IsString,
  IsUUID,
  Length,
  Matches,
} from "class-validator";
import { roles } from "./policy.js";
export class CreateOrganizationDto {
  @IsString() @Length(1, 120) @Matches(/\S/) name!: string;
  @IsString() @Length(1, 100) timezone!: string;
}
export class UpdateOrganizationDto {
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Length(1, 120)
  @Matches(/\S/)
  name?: string;
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Length(1, 100)
  timezone?: string;
}
export class CreateMembershipDto {
  @IsUUID() userId!: string;
  @IsIn(roles) role!: (typeof roles)[number];
}
export class UpdateMembershipDto {
  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(roles)
  role?: (typeof roles)[number];
  @ValidateIf((_o, v) => v !== undefined) @IsBoolean() active?: boolean;
}
