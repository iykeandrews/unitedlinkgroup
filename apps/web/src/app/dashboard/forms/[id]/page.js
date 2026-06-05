"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Page;
const navigation_1 = require("next/navigation");
const EmployeeFormFill_1 = require("../../../../components/people/EmployeeFormFill");
function Page() {
    const params = (0, navigation_1.useParams)();
    const id = String((params === null || params === void 0 ? void 0 : params.id) || '');
    return <EmployeeFormFill_1.EmployeeFormFill assignmentId={id}/>;
}
