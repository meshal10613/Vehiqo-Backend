export const vehicleTypeSearchableFields = [
    "name",
    "category.name",
];

export const vehicleTypeFilterableFields = [
    "name",
    "isElectric",
    "requiresLicense",
    "createdAt",
    "updatedAt",
    "category.name",
    "vehicles.brand",
    "vehicles.model",
    "vehicles._count",
    "vehicles._count_gte",
    "vehicles._count_lte",
];
