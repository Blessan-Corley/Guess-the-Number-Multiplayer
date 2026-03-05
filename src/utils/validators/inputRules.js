function sanitizeHtml(input) {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function validateInput(input, rules) {
  const errors = [];
  let cleanValue = input;

  if (rules.required && (input === null || input === undefined || input === '')) {
    errors.push(`${rules.field || 'Field'} is required`);
    return { valid: false, errors, cleanValue: null };
  }

  if (input !== null && input !== undefined && rules.type) {
    if (typeof input !== rules.type) {
      errors.push(`${rules.field || 'Field'} must be of type ${rules.type}`);
    }
  }

  if (typeof input === 'string') {
    cleanValue = input.trim();

    if (rules.minLength && cleanValue.length < rules.minLength) {
      errors.push(`${rules.field || 'Field'} must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && cleanValue.length > rules.maxLength) {
      errors.push(`${rules.field || 'Field'} cannot exceed ${rules.maxLength} characters`);
    }

    if (rules.pattern && !rules.pattern.test(cleanValue)) {
      errors.push(`${rules.field || 'Field'} format is invalid`);
    }

    if (rules.sanitize) {
      cleanValue = sanitizeHtml(cleanValue);
    }
  }

  if (typeof input === 'number') {
    if (rules.min !== undefined && input < rules.min) {
      errors.push(`${rules.field || 'Field'} must be at least ${rules.min}`);
    }

    if (rules.max !== undefined && input > rules.max) {
      errors.push(`${rules.field || 'Field'} cannot exceed ${rules.max}`);
    }

    if (rules.integer && !Number.isInteger(input)) {
      errors.push(`${rules.field || 'Field'} must be a whole number`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    cleanValue,
  };
}

function validateBatch(data, validationRules) {
  const results = {};
  const allErrors = [];
  let isValid = true;

  Object.keys(validationRules).forEach((field) => {
    const result = validateInput(data[field], {
      ...validationRules[field],
      field,
    });

    results[field] = result;

    if (!result.valid) {
      isValid = false;
      allErrors.push(...result.errors);
    }
  });

  return {
    valid: isValid,
    errors: allErrors,
    fieldResults: results,
    cleanData: Object.keys(results).reduce((clean, field) => {
      if (results[field].valid) {
        clean[field] = results[field].cleanValue;
      }
      return clean;
    }, {}),
  };
}

module.exports = {
  sanitizeHtml,
  validateInput,
  validateBatch,
};
