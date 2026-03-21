export const vehicleCategoryFilterableFields = [
    "name",
    "description",
    "createdAt",
    "updatedAt",
    "types._count",
    "types.vehicles._count",
    "types.VehicleType.name",
    "types.VehicleType.isElectric",
    "types.VehicleType.requiresLicense",
];

export const vehicleCategorySearchableFields = ["name", "description"];