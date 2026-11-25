import { z } from "zod";
export const uuid = z.string().uuid();
export const organizationInput = z
  .object({
    name: z
      .string({ error: "Informe o nome da organização." })
      .trim()
      .min(1, "Informe o nome da organização.")
      .max(120, "Use até 120 caracteres."),
    timezone: z
      .string({ error: "Informe o fuso horário IANA." })
      .min(1, "Informe o fuso horário IANA.")
      .max(100, "Use até 100 caracteres no fuso horário.")
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("pt-BR", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Informe um fuso IANA válido, como America/Sao_Paulo."),
  })
  .strict();
export type FormState = {
  status: "idle" | "error";
  message?: string;
  fields?: { name?: string; timezone?: string };
  requestId?: string;
};
export const initialForm: FormState = { status: "idle" };
