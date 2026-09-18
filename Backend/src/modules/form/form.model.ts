export interface FormData {
    formId: number;
    userId: number;
    dateCreated: string;
    statusId: number;
}

export interface StatusData {
    statusId: number;
    statusName: string;
}

export interface FormListRow extends FormData {
    userName: string;
    statusName: string | null;
}

export interface CreateFormInput {
    userId: number;
}

export interface UpdateFormStatusInput {
    statusId: number;
}
