// Mirrors the server's rule in backend/app/schemas.py. The server is the authority — this
// exists so the form can say the rule before the request is made, not so it can decide it.
// Anything rejected here would be rejected there; the reverse is not guaranteed, because the
// server also refuses common passwords and ones containing the account name.
export const MIN_PASSWORD_LENGTH = 12;

export const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters. Length matters more than symbols — a short phrase beats "P@ssw0rd".`;
