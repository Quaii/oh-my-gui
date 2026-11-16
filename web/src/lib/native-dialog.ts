type Question = {
  id: string;
  multi?: boolean;
  recommended?: number;
  options: { label: string }[];
};
export type NativeAnswer = {
  id: string;
  selectedOptions: string[];
  customInput?: string;
};

export function initialAnswers(questions: Question[]): NativeAnswer[] {
  return questions.map((question) => ({
    id: question.id,
    selectedOptions: question.options[question.recommended ?? -1]
      ? [question.options[question.recommended!].label]
      : [],
  }));
}

export function changeAnswer(
  answers: NativeAnswer[],
  index: number,
  option: string,
  multi: boolean,
) {
  return answers.map((answer, i) =>
    i !== index
      ? answer
      : {
          ...answer,
          selectedOptions: multi
            ? answer.selectedOptions.includes(option)
              ? answer.selectedOptions.filter((value) => value !== option)
              : [...answer.selectedOptions, option]
            : [option],
          customInput: multi ? answer.customInput : "",
        },
  );
}

export function dialogDeadline(dialog: {
  timeout?: number;
  receivedAt?: number;
}) {
  return Number.isFinite(dialog.timeout) &&
    dialog.timeout! >= 0 &&
    Number.isFinite(dialog.receivedAt)
    ? dialog.receivedAt! + dialog.timeout!
    : null;
}
