export interface SignupStartInput {
  groupId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  referral: string;
  referralName?: string;
  whoYouAre?: string;
  interests?: string[];
  linkedin?: string;
  message: string;
  disclaimerAccepted: boolean;
}

export function validateSignupStart(input: Partial<SignupStartInput>): SignupStartInput {
  const required = ["firstName", "lastName", "email", "phone", "state", "referral", "message"] as const;
  for (const key of required) {
    if (typeof input[key] !== "string" || input[key]!.trim() === "") throw new Error(`${key} is required`);
  }
  if (!input.disclaimerAccepted) throw new Error("Compliance disclaimer must be accepted");
  const email = input.email!.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("A valid email is required");
  const validated: SignupStartInput = {
    firstName: input.firstName!.trim(),
    lastName: input.lastName!.trim(),
    email,
    phone: input.phone!.trim(),
    state: input.state!.trim(),
    referral: input.referral!.trim(),
    interests: Array.isArray(input.interests) ? input.interests.map(String).filter(Boolean) : [],
    message: input.message!.trim(),
    disclaimerAccepted: true,
  };
  if (input.groupId?.trim()) validated.groupId = input.groupId.trim();
  if (input.referralName?.trim()) validated.referralName = input.referralName.trim();
  if (input.whoYouAre?.trim()) validated.whoYouAre = input.whoYouAre.trim();
  if (input.linkedin?.trim()) validated.linkedin = input.linkedin.trim();
  return validated;
}
