"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateQualificationDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_qualification_dto_1 = require("./create-qualification.dto");
class UpdateQualificationDto extends (0, mapped_types_1.PartialType)(create_qualification_dto_1.CreateQualificationDto) {
}
exports.UpdateQualificationDto = UpdateQualificationDto;
